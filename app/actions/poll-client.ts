import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Centralized Supabase client creation with error handling and configuration
 */
class PollSupabaseClient {
  private static instance: SupabaseClient | null = null;
  
  /**
   * Get or create a Supabase client instance
   */
  static getInstance(): SupabaseClient {
    if (!this.instance) {
      try {
        this.instance = createClient();
      } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        throw new Error('Database connection failed');
      }
    }
    return this.instance;
  }
  
  /**
   * Reset the client instance (useful for testing or reconnection)
   */
  static resetInstance(): void {
    this.instance = null;
  }
  
  /**
   * Get a fresh client instance
   */
  static getFreshInstance(): SupabaseClient {
    this.resetInstance();
    return this.getInstance();
  }
}

/**
 * Get the centralized Supabase client
 * @returns SupabaseClient instance
 */
export function getSupabaseClient(): SupabaseClient {
  return PollSupabaseClient.getInstance();
}

/**
 * Get a fresh Supabase client (creates new instance)
 * @returns Fresh SupabaseClient instance
 */
export function getFreshSupabaseClient(): SupabaseClient {
  return PollSupabaseClient.getFreshInstance();
}

/**
 * Reset the Supabase client instance
 */
export function resetSupabaseClient(): void {
  PollSupabaseClient.resetInstance();
}
