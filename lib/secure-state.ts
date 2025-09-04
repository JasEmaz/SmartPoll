/**
 * Secure State Management Utilities
 * 
 * SECURITY FEATURES:
 * - Prevents sensitive data exposure in React DevTools
 * - Secure client-side state management
 * - Token obfuscation and protection
 * - Safe error state handling
 * - Production-ready state serialization
 */

import { useCallback, useRef, useEffect } from 'react';
import { logger } from './logger';

// Symbol for internal state storage (hidden from DevTools)
const SECURE_STATE_KEY = Symbol('secure-state');

interface SecureStateOptions {
  shouldLog?: boolean;
  component?: string;
}

/**
 * Custom hook for managing sensitive state data
 * Hidden from React DevTools in production
 */
export function useSecureState<T>(
  initialValue: T,
  options: SecureStateOptions = {}
): [T, (newValue: T) => void, () => void] {
  // Use ref to store sensitive data (not visible in React DevTools)
  const secureRef = useRef<{ [SECURE_STATE_KEY]: T }>({
    [SECURE_STATE_KEY]: initialValue
  });
  
  // Force re-render hook
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  const setValue = useCallback((newValue: T) => {
    secureRef.current[SECURE_STATE_KEY] = newValue;
    
    if (options.shouldLog && process.env.NODE_ENV === 'development') {
      logger.debug('Secure state updated', {
        component: options.component,
        action: 'setState'
      });
    }
    
    forceUpdate();
  }, [options.shouldLog, options.component]);
  
  const clearValue = useCallback(() => {
    secureRef.current[SECURE_STATE_KEY] = initialValue;
    forceUpdate();
  }, [initialValue]);
  
  return [secureRef.current[SECURE_STATE_KEY], setValue, clearValue];
}

/**
 * Token obfuscation for display purposes
 * Shows only first/last characters to prevent shoulder surfing
 */
export function obfuscateToken(token: string): string {
  if (!token || token.length < 8) {
    return '***';
  }
  
  const start = token.substring(0, 4);
  const end = token.substring(token.length - 4);
  const middle = '*'.repeat(Math.max(token.length - 8, 3));
  
  return `${start}${middle}${end}`;
}

/**
 * Safe serialization that removes sensitive data
 */
export function safeSerialization(data: any): any {
  if (!data) return data;
  
  try {
    const jsonString = JSON.stringify(data, (key, value) => {
      const sensitiveKeys = [
        'token', 'password', 'secret', 'auth', 'jwt',
        'access_token', 'refresh_token', 'session_id',
        'api_key', 'private_key', 'bearer'
      ];
      
      if (sensitiveKeys.some(sensitiveKey => 
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      )) {
        return '[REDACTED]';
      }
      
      return value;
    });
    
    return JSON.parse(jsonString);
  } catch (error) {
    logger.error('Safe serialization failed', { action: 'serialize' }, error);
    return '[SERIALIZATION_ERROR]';
  }
}

/**
 * Secure local storage wrapper
 * Encrypts sensitive data before storing
 */
class SecureStorage {
  private readonly prefix = '__secure_';
  
  /**
   * Simple XOR encryption for client-side obfuscation
   * Note: This is not cryptographically secure, just prevents casual inspection
   */
  private encrypt(data: string): string {
    const key = this.getClientKey();
    let encrypted = '';
    
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return btoa(encrypted);
  }
  
  private decrypt(encryptedData: string): string {
    try {
      const encrypted = atob(encryptedData);
      const key = this.getClientKey();
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      
      return decrypted;
    } catch (error) {
      logger.warn('Failed to decrypt stored data', { action: 'decrypt' });
      return '';
    }
  }
  
  private getClientKey(): string {
    // Generate a client-specific key based on browser characteristics
    // This provides basic obfuscation, not cryptographic security
    const userAgent = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    return btoa(userAgent + screen).substring(0, 16);
  }
  
  setItem(key: string, value: any): void {
    if (typeof window === 'undefined') return;
    
    try {
      const serialized = JSON.stringify(safeSerialization(value));
      const encrypted = this.encrypt(serialized);
      localStorage.setItem(this.prefix + key, encrypted);
    } catch (error) {
      logger.error('Failed to store secure item', { action: 'setItem', key }, error);
    }
  }
  
  getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const encrypted = localStorage.getItem(this.prefix + key);
      if (!encrypted) return null;
      
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      logger.warn('Failed to retrieve secure item', { action: 'getItem', key });
      return null;
    }
  }
  
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.prefix + key);
  }
  
  clear(): void {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

export const secureStorage = new SecureStorage();

/**
 * Secure session storage wrapper
 */
class SecureSessionStorage {
  private readonly prefix = '__session_secure_';
  
  setItem(key: string, value: any): void {
    if (typeof window === 'undefined') return;
    
    try {
      const serialized = JSON.stringify(safeSerialization(value));
      sessionStorage.setItem(this.prefix + key, serialized);
    } catch (error) {
      logger.error('Failed to store secure session item', { action: 'setSessionItem', key }, error);
    }
  }
  
  getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const item = sessionStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) as T : null;
    } catch (error) {
      logger.warn('Failed to retrieve secure session item', { action: 'getSessionItem', key });
      return null;
    }
  }
  
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(this.prefix + key);
  }
  
  clear(): void {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

export const secureSessionStorage = new SecureSessionStorage();

/**
 * Memory-only state store for highly sensitive data
 * Data is cleared when page is refreshed or closed
 */
class MemoryStore {
  private store = new Map<string, any>();
  private timers = new Map<string, NodeJS.Timeout>();
  
  set(key: string, value: any, ttlMs?: number): void {
    this.store.set(key, safeSerialization(value));
    
    // Clear any existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set expiration if TTL provided
    if (ttlMs) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttlMs);
      this.timers.set(key, timer);
    }
  }
  
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T;
  }
  
  delete(key: string): void {
    this.store.delete(key);
    
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
  
  clear(): void {
    this.store.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
  
  has(key: string): boolean {
    return this.store.has(key);
  }
}

export const memoryStore = new MemoryStore();

/**
 * Secure error state that doesn't expose sensitive information
 */
export interface SecureErrorState {
  hasError: boolean;
  userMessage: string;
  errorCode?: string;
  timestamp: string;
}

export function createSecureError(
  error: any,
  userMessage = 'An error occurred',
  errorCode?: string
): SecureErrorState {
  logger.clientError('Secure error created', { action: 'createError' }, error);
  
  return {
    hasError: true,
    userMessage,
    errorCode,
    timestamp: new Date().toISOString()
  };
}

export function clearSecureError(): SecureErrorState {
  return {
    hasError: false,
    userMessage: '',
    timestamp: new Date().toISOString()
  };
}

/**
 * Hook for managing secure form state
 */
export function useSecureForm<T extends Record<string, any>>(
  initialValues: T
) {
  const [values, setValues] = useSecureState(initialValues, {
    shouldLog: false,
    component: 'SecureForm'
  });
  
  const [errors, setErrors] = useSecureState<Record<keyof T, string>>({} as any);
  
  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [setValues, setErrors, errors]);
  
  const setError = useCallback((field: keyof T, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, [setErrors]);
  
  const clearErrors = useCallback(() => {
    setErrors({} as any);
  }, [setErrors]);
  
  const reset = useCallback(() => {
    setValues(initialValues);
    clearErrors();
  }, [setValues, initialValues, clearErrors]);
  
  return {
    values,
    errors,
    setValue,
    setError,
    clearErrors,
    reset
  };
}

/**
 * Development-only state inspector
 * Safely logs state without exposing sensitive data
 */
export function inspectState(state: any, label?: string): void {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(label || 'State Inspector', undefined, safeSerialization(state));
  }
}

// Import useReducer for internal use
import { useReducer } from 'react';

/**
 * Cleanup utility for component unmount
 */
export function useSecureCleanup(cleanupFn: () => void): void {
  useEffect(() => {
    return () => {
      try {
        cleanupFn();
      } catch (error) {
        logger.warn('Cleanup function failed', { action: 'cleanup' }, error);
      }
    };
  }, [cleanupFn]);
}
