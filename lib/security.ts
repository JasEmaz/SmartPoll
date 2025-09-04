import DOMPurify from 'dompurify';
import { z } from 'zod';

/**
 * Security Configuration Constants
 */
export const SECURITY_CONFIG = {
  // File upload constraints
  FILE_UPLOAD: {
    MAX_SIZE: 2 * 1024 * 1024, // 2MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  // Text input constraints
  TEXT_LIMITS: {
    POLL_QUESTION_MAX: 500,
    POLL_OPTION_MAX: 200,
    POLL_TITLE_MAX: 100,
    MIN_OPTIONS: 2,
    MAX_OPTIONS: 10,
  },
  // Rate limiting (future implementation)
  RATE_LIMITS: {
    POLL_CREATION: 5, // polls per hour
    VOTES_PER_MINUTE: 3,
  }
} as const;

/**
 * Input Sanitization Functions
 */
export class InputSanitizer {
  private static domPurifyConfig = {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    FORCE_BODY: false,
  };

  /**
   * Sanitize text input to prevent XSS attacks
   * Removes ALL HTML tags and dangerous characters
   */
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    // First pass: DOMPurify to remove HTML
    const purified = DOMPurify.sanitize(input, this.domPurifyConfig);
    
    // Second pass: Additional cleaning
    return purified
      .trim()
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove potential script injection patterns
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/on\w+=/gi, '');
  }

  /**
   * Sanitize and validate poll question
   */
  static sanitizePollQuestion(input: string): string {
    const sanitized = this.sanitizeText(input);
    
    if (sanitized.length > SECURITY_CONFIG.TEXT_LIMITS.POLL_QUESTION_MAX) {
      throw new Error(`Question exceeds ${SECURITY_CONFIG.TEXT_LIMITS.POLL_QUESTION_MAX} characters`);
    }
    
    return sanitized;
  }

  /**
   * Sanitize and validate poll option
   */
  static sanitizePollOption(input: string): string {
    const sanitized = this.sanitizeText(input);
    
    if (sanitized.length > SECURITY_CONFIG.TEXT_LIMITS.POLL_OPTION_MAX) {
      throw new Error(`Option exceeds ${SECURITY_CONFIG.TEXT_LIMITS.POLL_OPTION_MAX} characters`);
    }
    
    return sanitized;
  }

  /**
   * Sanitize URL for safe display
   */
  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid URL protocol');
      }
      return parsed.toString();
    } catch {
      throw new Error('Invalid URL format');
    }
  }
}

/**
 * File Upload Validation
 */
export class FileValidator {
  /**
   * Validate file type and size for uploads
   */
  static validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > SECURITY_CONFIG.FILE_UPLOAD.MAX_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds ${SECURITY_CONFIG.FILE_UPLOAD.MAX_SIZE / (1024 * 1024)}MB limit`
      };
    }

    // Check MIME type
    if (!SECURITY_CONFIG.FILE_UPLOAD.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} not allowed. Only images are permitted.`
      };
    }

    // Check file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!SECURITY_CONFIG.FILE_UPLOAD.ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        isValid: false,
        error: `File extension ${extension} not allowed`
      };
    }

    // Additional security checks
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return {
        isValid: false,
        error: 'Invalid file name'
      };
    }

    return { isValid: true };
  }

  /**
   * Generate secure filename
   */
  static generateSecureFilename(originalName: string, userId: string): string {
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    
    // Create a secure filename: userId_timestamp_random.ext
    return `${userId}_${timestamp}_${random}${extension}`.replace(/[^a-zA-Z0-9._-]/g, '');
  }
}

/**
 * Zod Validation Schemas
 */
export const ValidationSchemas = {
  // Poll creation schema
  createPoll: z.object({
    question: z
      .string()
      .min(1, 'Question is required')
      .max(SECURITY_CONFIG.TEXT_LIMITS.POLL_QUESTION_MAX, 
           `Question must not exceed ${SECURITY_CONFIG.TEXT_LIMITS.POLL_QUESTION_MAX} characters`)
      .transform(InputSanitizer.sanitizeText),
    
    options: z
      .array(z.object({
        text: z
          .string()
          .min(1, 'Option text is required')
          .max(SECURITY_CONFIG.TEXT_LIMITS.POLL_OPTION_MAX,
               `Option must not exceed ${SECURITY_CONFIG.TEXT_LIMITS.POLL_OPTION_MAX} characters`)
          .transform(InputSanitizer.sanitizeText),
        id: z.string().optional()
      }))
      .min(SECURITY_CONFIG.TEXT_LIMITS.MIN_OPTIONS, 
           `At least ${SECURITY_CONFIG.TEXT_LIMITS.MIN_OPTIONS} options required`)
      .max(SECURITY_CONFIG.TEXT_LIMITS.MAX_OPTIONS,
           `Maximum ${SECURITY_CONFIG.TEXT_LIMITS.MAX_OPTIONS} options allowed`)
      .refine(
        (options) => {
          // Check for duplicate options (case-insensitive)
          const texts = options.map(opt => opt.text.toLowerCase().trim());
          return new Set(texts).size === texts.length;
        },
        { message: 'Duplicate options are not allowed' }
      ),
    
    expiresAt: z
      .string()
      .optional()
      .refine(
        (date) => !date || new Date(date) > new Date(),
        { message: 'Expiration date must be in the future' }
      ),
      
    // Optional file upload
    image: z
      .instanceof(File)
      .optional()
      .refine(
        (file) => !file || FileValidator.validateFile(file).isValid,
        { message: 'Invalid file upload' }
      )
  }),

  // Vote submission schema
  vote: z.object({
    pollId: z.string().uuid('Invalid poll ID'),
    optionId: z.string().uuid('Invalid option ID')
  }),

  // User authentication schema
  auth: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters')
  })
};

/**
 * Security Headers Helper
 */
export class SecurityHeaders {
  /**
   * Get Content Security Policy header value
   */
  static getCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires some unsafe policies
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ');
  }

  /**
   * Get all security headers
   */
  static getAllHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': this.getCSPHeader(),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
  }
}

/**
 * Error Sanitization for Safe Logging
 */
export class ErrorSanitizer {
  /**
   * Sanitize error for client-side display
   * Removes sensitive information while keeping useful error messages
   */
  static sanitizeError(error: unknown): string {
    if (error instanceof Error) {
      // Remove sensitive patterns from error messages
      let message = error.message
        .replace(/password/gi, '[REDACTED]')
        .replace(/token/gi, '[REDACTED]')
        .replace(/key/gi, '[REDACTED]')
        .replace(/secret/gi, '[REDACTED]')
        .replace(/api[_-]?key/gi, '[REDACTED]')
        .replace(/database/gi, 'storage')
        .replace(/table/gi, 'collection');

      // Return generic error for certain types
      if (message.includes('connection') || message.includes('network')) {
        return 'Service temporarily unavailable. Please try again.';
      }

      return message.substring(0, 200); // Limit message length
    }

    return 'An unexpected error occurred';
  }

  /**
   * Create sanitized error object for logging (server-side only)
   */
  static createLogSafeError(error: unknown, context?: string): object {
    return {
      message: this.sanitizeError(error),
      context,
      timestamp: new Date().toISOString(),
      // Don't include stack traces in production
      stack: process.env.NODE_ENV === 'development' ? (error as Error)?.stack : undefined
    };
  }
}

/**
 * Rate Limiting Helper (In-memory implementation for development)
 * For production, use Redis or similar
 */
export class RateLimiter {
  private static requests = new Map<string, number[]>();

  static isRateLimited(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the time window
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= limit) {
      return true;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return false;
  }

  /**
   * Clean up old entries (call periodically)
   */
  static cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(timestamp => timestamp > oneHourAgo);
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
}
