import type { ApiResponse, PollOperationError } from './poll-types';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better error tracking and handling
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  NETWORK = 'network',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown'
}

/**
 * Enhanced error information
 */
export interface ErrorInfo {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage?: string;
  details?: string;
  timestamp: string;
}

/**
 * Logger interface for error logging
 */
interface Logger {
  error: (message: string, error?: any) => void;
  warn: (message: string, error?: any) => void;
  info: (message: string) => void;
}

/**
 * Default console logger
 */
const defaultLogger: Logger = {
  error: (message: string, error?: any) => console.error(message, error),
  warn: (message: string, error?: any) => console.warn(message, error),
  info: (message: string) => console.info(message)
};

/**
 * Error mapping for common database errors
 */
const DATABASE_ERROR_MAP: Record<string, Partial<ErrorInfo>> = {
  'PGRST116': {
    code: 'NOT_FOUND',
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'The requested item was not found'
  },
  '23505': {
    code: 'DUPLICATE_KEY',
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'This item already exists'
  },
  '23503': {
    code: 'FOREIGN_KEY_VIOLATION',
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Related item not found'
  },
  '23502': {
    code: 'NOT_NULL_VIOLATION',
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Required field is missing'
  }
};

/**
 * Convert a database error to ErrorInfo
 * @param error - The database error
 * @returns ErrorInfo - The formatted error information
 */
function mapDatabaseError(error: PostgrestError): ErrorInfo {
  const mapping = DATABASE_ERROR_MAP[error.code] || {};
  
  return {
    code: mapping.code || 'DATABASE_ERROR',
    category: mapping.category || ErrorCategory.DATABASE,
    severity: mapping.severity || ErrorSeverity.MEDIUM,
    message: error.message,
    userMessage: mapping.userMessage || 'A database error occurred',
    details: error.details || error.hint,
    timestamp: new Date().toISOString()
  };
}

/**
 * Convert a generic error to ErrorInfo
 * @param error - The error to convert
 * @param context - Additional context about the error
 * @returns ErrorInfo - The formatted error information
 */
function mapGenericError(error: unknown, context?: string): ErrorInfo {
  const timestamp = new Date().toISOString();
  
  if (error instanceof Error) {
    // Check if it's a PollOperationError
    if ('code' in error) {
      const pollError = error as PollOperationError;
      return {
        code: pollError.code || 'POLL_OPERATION_ERROR',
        category: ErrorCategory.SERVER,
        severity: ErrorSeverity.MEDIUM,
        message: pollError.message,
        userMessage: pollError.message,
        details: pollError.details,
        timestamp
      };
    }
    
    // Standard Error
    return {
      code: 'GENERAL_ERROR',
      category: ErrorCategory.SERVER,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: error.message,
      timestamp
    };
  }
  
  // Unknown error type
  return {
    code: 'UNKNOWN_ERROR',
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.HIGH,
    message: String(error),
    userMessage: 'An unexpected error occurred',
    timestamp
  };
}

/**
 * Enhanced error handler with logging and categorization
 * @param error - The error to handle
 * @param customMessage - Custom error message prefix
 * @param context - Additional context for logging
 * @param logger - Logger instance (optional)
 * @returns ApiResponse - Standardized API response
 */
export function handleError<T = any>(
  error: unknown, 
  customMessage: string = 'An error occurred',
  context?: string,
  logger: Logger = defaultLogger
): ApiResponse<T> {
  let errorInfo: ErrorInfo;
  
  // Map error based on type
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    // Likely a PostgrestError
    errorInfo = mapDatabaseError(error as PostgrestError);
  } else {
    // Generic error
    errorInfo = mapGenericError(error, context);
  }
  
  // Create full error message with context
  const fullMessage = context 
    ? `${customMessage} (${context}): ${errorInfo.message}`
    : `${customMessage}: ${errorInfo.message}`;
  
  // Log based on severity
  switch (errorInfo.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      logger.error(fullMessage, { error, errorInfo, context });
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn(fullMessage, { error, errorInfo, context });
      break;
    default:
      logger.info(fullMessage);
  }
  
  return {
    success: false,
    error: errorInfo.userMessage || errorInfo.message
  };
}

/**
 * Create a standardized success response
 * @param data - The response data
 * @returns ApiResponse - Success API response
 */
export function createSuccessResponse<T>(data?: T): ApiResponse<T> {
  return {
    success: true,
    data
  };
}

/**
 * Create a standardized error response
 * @param message - Error message
 * @param code - Error code (optional)
 * @returns ApiResponse - Error API response
 */
export function createErrorResponse<T = any>(message: string, code?: string): ApiResponse<T> {
  return {
    success: false,
    error: message
  };
}

/**
 * Handle authentication errors specifically
 * @param error - The authentication error
 * @param operation - The operation that required authentication
 * @returns ApiResponse - Standardized API response
 */
export function handleAuthError<T = any>(error: unknown, operation: string = 'this operation'): ApiResponse<T> {
  return handleError(
    error,
    `Authentication required for ${operation}`,
    'AUTH_ERROR'
  );
}

/**
 * Handle validation errors specifically
 * @param message - Validation error message
 * @returns ApiResponse - Standardized API response
 */
export function handleValidationError<T = any>(message: string): ApiResponse<T> {
  return createErrorResponse<T>(message);
}

/**
 * Handle authorization/permission errors
 * @param resource - The resource being accessed
 * @param action - The action being performed
 * @returns ApiResponse - Standardized API response
 */
export function handlePermissionError<T = any>(resource: string, action: string): ApiResponse<T> {
  return createErrorResponse<T>(`You do not have permission to ${action} this ${resource}`);
}

/**
 * Handle not found errors
 * @param resource - The resource that was not found
 * @returns ApiResponse - Standardized API response
 */
export function handleNotFoundError<T = any>(resource: string): ApiResponse<T> {
  return createErrorResponse<T>(`${resource} not found`);
}

/**
 * Wrap an async operation with error handling
 * @param operation - The async operation to execute
 * @param errorMessage - Custom error message for failures
 * @param context - Additional context for logging
 * @returns Promise<ApiResponse<T>> - The operation result wrapped in ApiResponse
 */
export async function wrapWithErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Operation failed',
  context?: string
): Promise<ApiResponse<T>> {
  try {
    const result = await operation();
    return createSuccessResponse(result);
  } catch (error) {
    return handleError(error, errorMessage, context);
  }
}
