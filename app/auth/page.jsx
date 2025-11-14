'use client';

import { useState } from 'react';
import React from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLoader } from '@/context/LoaderContext';

export default function SignInPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false); // New state for toggling
  const router = useRouter();
  const { setIsLoading } = useLoader();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsLoading(true);

    // Call the signIn function from next-auth/react
    const result = await signIn('credentials', {
      redirect: false, // Prevents automatic redirect on success
      username,
      password,
    });

    setLoading(false);
    setIsLoading(false);

    if (result?.error) {
      setError('Invalid username or password.');
      console.error('Sign in failed:', result.error);
    } else {
      // Success! The redirect will be handled by the middleware.
      router.push('/webapps');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // If user is successfully created, log them in
        await signIn('credentials', { username, password, redirect: false });
        router.push('/mochlist');
      } else {
        setError(data.error || 'Failed to sign up. Please try again.');
      }
    } catch (err) {
      console.error('Sign up failed:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-linear-to-br from-[#c6a27e] via-[#a67c52] to-[#6f4e37] min-h-screen flex items-center justify-center font-sans">
      <div className="bg-[#f3e5d8] p-10 rounded-2xl shadow-2xl w-full max-w-md border border-[#bfa27a] flex flex-col items-center animate-fade-in">
        <div className="mb-6 flex flex-col items-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-2">
            <ellipse cx="24" cy="38" rx="16" ry="6" fill="#bfa27a" />
            <path d="M12 38c0-8 8-14 12-14s12 6 12 14" stroke="#6f4e37" strokeWidth="2" fill="none" />
            <ellipse cx="24" cy="24" rx="12" ry="10" fill="#a67c52" />
            <ellipse cx="24" cy="22" rx="8" ry="6" fill="#f3e5d8" />
          </svg>
          <h1 className="text-3xl font-bold text-center text-[#6f4e37] drop-shadow mb-1">{isSigningUp ? 'Sign Up' : 'Sign In'}</h1>
          <p className="text-center text-[#a67c52] text-sm">Welcome to Mocha! Enjoy your coffee break.</p>
        </div>

        <form onSubmit={isSigningUp ? handleSignUp : handleSubmit} className="space-y-6 w-full">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-[#6f4e37]">Username</label>
            <div className="mt-1">
              <input
                id="username"
                name="username"
                type="text"
                required
                className="input input-bordered w-full bg-[#f3e5d8] text-[#6f4e37] border-[#bfa27a] placeholder-[#bfa27a] focus:outline-none focus:ring-2 focus:ring-[#a67c52] focus:border-[#a67c52] focus:text-[#6f4e37]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete={"off"}
                style={{ WebkitTextFillColor: '#6f4e37' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#6f4e37]">Password</label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input input-bordered w-full bg-[#f3e5d8] text-[#6f4e37] border-[#bfa27a] placeholder-[#bfa27a] focus:outline-none focus:ring-2 focus:ring-[#a67c52] focus:border-[#a67c52]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-center text-sm font-medium text-[#d7263d]">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow text-sm font-semibold text-white bg-linear-to-r from-[#a67c52] to-[#6f4e37] hover:from-[#bfa27a] hover:to-[#a67c52] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#a67c52] transition duration-200"
              disabled={loading}
            >
              {loading ? (isSigningUp ? 'Signing up...' : 'Signing in...') : (isSigningUp ? 'Sign Up' : 'Sign In')}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#a67c52]">
            {isSigningUp ? 'Already have an account?' : 'Don\'t have an account?'}
            <button
              onClick={() => setIsSigningUp(!isSigningUp)}
              className="font-semibold text-[#6f4e37] hover:text-[#a67c52] ml-1 transition duration-200 underline"
            >
              {isSigningUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
