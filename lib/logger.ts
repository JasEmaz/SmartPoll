/**
 * Production-Safe Logging Utility
 * 
 * SECURITY FEATURES:
 * - Automatically strips console.log in production
 * - Sanitizes sensitive data from logs
 * - Provides structured logging with levels
 * - Prevents token/secret exposure
 * - Client-safe error reporting
 */

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /bearer[\s]+[a-zA-Z0-9\-._~+/]+=*/i,
  /jwt[\s]*[:=][\s]*[a-zA-Z0-9\-._~+/]+=*/i,
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /private[_-]?key/i,
  /session[_-]?id/i,
  /cookie/i,
  /supabase_anon_key/i,
  /supabase_service_role_key/i
];

// Sensitive object keys to redact
const SENSITIVE_KEYS = [
  'access_token',
  'refresh_token',
  'auth_token',
  'bearer_token',
  'jwt',
  'token',
  'password',
  'secret',
  'private_key',
  'api_key',
  'session_id',
  'cookie',
  'supabase_anon_key',
  'supabase_service_role_key',
  'Authorization',
  'x-api-key'
];

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

interface LogContext {
  component?: string;
  userId?: string;
  action?: string;
  pollId?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (typeof data === 'object') {
      return this.sanitizeObject(data);
    }

    return data;
  }

  /**
   * Sanitize string values for sensitive patterns
   */
  private sanitizeString(str: string): string {
    let sanitized = str;
    
    SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Redact potential JWT tokens (base64 encoded strings with dots)
    sanitized = sanitized.replace(/eyJ[a-zA-Z0-9\-._~+/]+=*/g, '[JWT_REDACTED]');
    
    // Redact UUIDs that might be session IDs
    sanitized = sanitized.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID_REDACTED]');
    
    return sanitized;
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeData(item));
    }

    if (obj instanceof Date) {
      return obj;
    }

    if (obj instanceof Error) {
      return {
        name: obj.name,
        message: this.sanitizeString(obj.message),
        stack: this.isDevelopment ? this.sanitizeString(obj.stack || '') : '[REDACTED]'
      };
    }

    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.sanitizeData(value);
      }
    }

    return sanitized;
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(level: string, message: string, context?: LogContext, data?: any) {
    const timestamp = new Date().toISOString();
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const sanitizedContext = context ? this.sanitizeData(context) : undefined;

    return {
      timestamp,
      level,
      message: this.sanitizeString(message),
      context: sanitizedContext,
      data: sanitizedData,
      environment: process.env.NODE_ENV
    };
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext, data?: any): void {
    if (this.level <= LogLevel.DEBUG && this.isDevelopment) {
      const logEntry = this.createLogEntry('DEBUG', message, context, data);
      console.log('🐛 [DEBUG]', logEntry);
    }
  }

  /**
   * Log general information
   */
  info(message: string, context?: LogContext, data?: any): void {
    if (this.level <= LogLevel.INFO) {
      const logEntry = this.createLogEntry('INFO', message, context, data);
      
      if (this.isDevelopment) {
        console.log('ℹ️ [INFO]', logEntry);
      } else {
        // In production, send to external logging service
        this.sendToLoggingService(logEntry);
      }
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext, data?: any): void {
    if (this.level <= LogLevel.WARN) {
      const logEntry = this.createLogEntry('WARN', message, context, data);
      
      if (this.isDevelopment) {
        console.warn('⚠️ [WARN]', logEntry);
      } else {
        this.sendToLoggingService(logEntry);
      }
    }
  }

  /**
   * Log errors
   */
  error(message: string, context?: LogContext, data?: any): void {
    if (this.level <= LogLevel.ERROR) {
      const logEntry = this.createLogEntry('ERROR', message, context, data);
      
      if (this.isDevelopment) {
        console.error('🚨 [ERROR]', logEntry);
      } else {
        this.sendToLoggingService(logEntry);
      }
    }
  }

  /**
   * Log client-safe errors (never includes sensitive data)
   */
  clientError(message: string, context?: Omit<LogContext, 'metadata'>, error?: Error): void {
    const safeContext = context ? {
      component: context.component,
      action: context.action,
      userId: context.userId ? '[USER_ID_REDACTED]' : undefined,
      pollId: context.pollId ? '[POLL_ID_REDACTED]' : undefined
    } : undefined;

    const safeError = error ? {
      name: error.name,
      message: 'Client error occurred',
      timestamp: new Date().toISOString()
    } : undefined;

    this.error(message, safeContext, safeError);
  }

  /**
   * Send logs to external service in production
   */
  private sendToLoggingService(logEntry: any): void {
    // In a real application, you would send logs to:
    // - Sentry
    // - DataDog
    // - CloudWatch
    // - Custom logging endpoint
    
    // For now, we'll just store in a way that doesn't expose to client
    if (typeof window === 'undefined') {
      // Server-side logging only
      try {
        // Example: Send to external service
        // await fetch('/api/logs', { method: 'POST', body: JSON.stringify(logEntry) });
      } catch (err) {
        // Fallback - but never expose sensitive data
      }
    }
  }

  /**
   * Create a child logger with context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    
    // Override methods to include context
    const originalDebug = childLogger.debug.bind(childLogger);
    const originalInfo = childLogger.info.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalError = childLogger.error.bind(childLogger);

    childLogger.debug = (message: string, additionalContext?: LogContext, data?: any) => {
      originalDebug(message, { ...context, ...additionalContext }, data);
    };

    childLogger.info = (message: string, additionalContext?: LogContext, data?: any) => {
      originalInfo(message, { ...context, ...additionalContext }, data);
    };

    childLogger.warn = (message: string, additionalContext?: LogContext, data?: any) => {
      originalWarn(message, { ...context, ...additionalContext }, data);
    };

    childLogger.error = (message: string, additionalContext?: LogContext, data?: any) => {
      originalError(message, { ...context, ...additionalContext }, data);
    };

    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const createLogger = (context: LogContext) => logger.child(context);

// Development-only logging helper
export const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Dev Log', undefined, args);
  }
};

// Client-safe error boundary helper
export const logClientError = (error: Error, component: string, action?: string) => {
  logger.clientError(
    'Client error in component',
    { component, action },
    error
  );
};

// Safe data exposure helper for debugging
export const safeLog = (data: any, label?: string) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(label || 'Safe Log', undefined, data);
  }
};

/**
 * Utility to check if data contains sensitive information
 */
export const containsSensitiveData = (data: any): boolean => {
  if (!data) return false;
  
  const str = JSON.stringify(data).toLowerCase();
  
  return SENSITIVE_KEYS.some(key => str.includes(key.toLowerCase())) ||
         SENSITIVE_PATTERNS.some(pattern => pattern.test(str));
};

/**
 * Create production-safe error response
 */
export const createSafeErrorResponse = (error: any, defaultMessage = 'An error occurred') => {
  if (process.env.NODE_ENV === 'development') {
    return {
      error: true,
      message: error?.message || defaultMessage,
      details: error
    };
  }
  
  return {
    error: true,
    message: defaultMessage
  };
};
