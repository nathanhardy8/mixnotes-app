'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // We expect ?token=...&email=...
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Basic validation on load (not strictly necessary as API will fail)
    if (!token || !email) {
        return (
            <div style={{ color: '#ef4444' }}>
                Invalid link. Please request a new password reset link.
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to reset password');
            }

            setMessage({ type: 'success', text: 'Password reset successfully!' });

            // Redirect after delay
            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (message?.type === 'success') {
        return (
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h2 style={{ color: '#16a34a', marginBottom: '0.5rem' }}>Success!</h2>
                <p style={{ color: '#334155', marginBottom: '1.5rem' }}>
                    Your password has been updated. Redirecting to login...
                </p>
                <Link href="/login" style={{ color: '#2563eb', fontWeight: '500' }}>
                    Go to Login
                </Link>
            </div>
        );
    }

    return (
        <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>
                New Password
            </h1>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                Create a new password for <strong>{email}</strong>
            </p>

            {message?.type === 'error' && (
                <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>
                        New Password
                    </label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                        style={{
                            width: '100%', padding: '0.75rem', borderRadius: '8px',
                            border: '1px solid #cbd5e1', fontSize: '1rem'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                        style={{
                            width: '100%', padding: '0.75rem', borderRadius: '8px',
                            border: '1px solid #cbd5e1', fontSize: '1rem'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                        width: '100%', padding: '0.75rem', borderRadius: '8px',
                        backgroundColor: '#2563eb', color: 'white', border: 'none',
                        fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.7 : 1
                    }}
                >
                    {isLoading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <div style={{
            display: 'flex', minHeight: '100vh', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: '#f1f5f9'
        }}>
            <div style={{
                background: 'white', padding: '2rem', borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', width: '100%', maxWidth: '400px'
            }}>
                <Suspense fallback={<div>Loading...</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
