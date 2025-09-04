'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormSubmit,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { createBrowserClient } from '@/lib/supabase';
import { ErrorSanitizer } from '@/lib/security';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createBrowserClient();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    
    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        // Handle specific error cases
        if (error.message.includes('User already registered')) {
          setError('An account with this email already exists. Please login instead.');
        } else if (error.message.includes('Password should be at least')) {
          setError('Password should be at least 6 characters long');
        } else {
          setError(ErrorSanitizer.sanitizeError(error));
        }
        return;
      }
      
      // Successful registration
      if (data.user && !data.session) {
        // Email confirmation required
        router.push('/auth/login?registered=true');
      } else if (data.session) {
        // Auto sign-in successful (if confirmation disabled)
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Create an Account</h1>
        <p className="text-muted-foreground">Enter your details to create a new account</p>
      </div>
      
      {error && (
        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}
      
      <Form onSubmit={handleSubmit}>
        <FormItem>
          <FormLabel htmlFor="email">Email</FormLabel>
          <FormControl>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="you@example.com" 
              required 
            />
          </FormControl>
        </FormItem>
        
        <FormItem>
          <FormLabel htmlFor="password">Password</FormLabel>
          <FormControl>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              required 
              minLength={8}
            />
          </FormControl>
          <FormMessage>Password must be at least 8 characters</FormMessage>
        </FormItem>
        
        <FormItem>
          <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
          <FormControl>
            <Input 
              id="confirmPassword" 
              name="confirmPassword" 
              type="password" 
              required 
            />
          </FormControl>
        </FormItem>
        
        <FormSubmit className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Register'}
        </FormSubmit>
      </Form>
      
      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary hover:underline">
          Login
        </Link>
      </div>
    </div>
  );
}