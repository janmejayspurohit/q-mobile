'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [genericPassword, setGenericPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login' ? { username, password } : { username, password, genericPassword };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to join page
      router.push('/join');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="flex flex-col gap-8 items-center justify-center max-w-md w-full">
        {/* Login/Register Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl w-full p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Image
                src="/tmo.png"
                alt="T-Mobile Logo"
                width={48}
                height={48}
                className="rounded-lg"
              />
              <h1 className="text-4xl font-bold text-white">Diwali Quiz</h1>
            </div>
            <p className="text-gray-400">Play to win a giftcard!</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                mode === 'login'
                  ? 'bg-purple-600 shadow text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                mode === 'register'
                  ? 'bg-purple-600 shadow text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-gray-800 text-white placeholder-gray-500"
                placeholder="Enter your username"
                required
                minLength={3}
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-gray-800 text-white placeholder-gray-500"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Generic Password
                </label>
                <input
                  type="password"
                  value={genericPassword}
                  onChange={(e) => setGenericPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition bg-gray-800 text-white placeholder-gray-500"
                  placeholder="Enter generic password"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Contact admin for the generic password</p>
              </div>
            )}

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-purple-700 hover:to-pink-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>

          {/* Admin Link */}
          <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            <Link
              href="/admin/login"
              className="text-sm text-purple-400 hover:text-purple-300 font-medium"
            >
              Admin Login →
            </Link>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-8 text-center w-full">
          <h2 className="text-2xl font-bold text-white mb-4">Scan to Join</h2>
          <div className="bg-white p-4 rounded-2xl inline-block">
            <Image
              src="/frame.png"
              alt="QR Code to join the game"
              width={250}
              height={250}
              className="rounded-lg"
              priority
            />
          </div>
          <p className="text-gray-400 mt-4 text-sm">Scan with your phone camera</p>
        </div>
      </div>
    </div>
  );
}
