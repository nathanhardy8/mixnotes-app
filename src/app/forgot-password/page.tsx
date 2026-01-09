'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            // Always show success state even if email failed (don't leak existence)
            setIsSubmitted(true);
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', minHeight: '100vh', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: '#f1f5f9'
        }}>
            <div style={{
                background: 'white', padding: '2rem', borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', width: '100%', maxWidth: '400px'
            }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>
                    Reset Password
                </h1>

                {!isSubmitted ? (
                    <>
                        <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            Enter your email and we'll send you a link to reset your password.
                        </p>

                        {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
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
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#16a34a', marginBottom: '1rem', fontWeight: '500' }}>
                            ✓ Link Sent
                        </div>
                        <p style={{ color: '#334155', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            If an account exists for <strong>{email}</strong>, you will receive an email instruction shortly.
                        </p>
                        <button
                            onClick={() => { setIsSubmitted(false); setEmail(''); }}
                            style={{
                                background: 'none', border: 'none', color: '#2563eb',
                                textDecoration: 'underline', cursor: 'pointer'
                            }}
                        >
                            Try another email
                        </button>
                    </div>
                )}

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    <Link href="/login" style={{ color: '#64748b', textDecoration: 'none' }}>
                        ← Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
