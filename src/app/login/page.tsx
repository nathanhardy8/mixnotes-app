'use client';

import React, { useState, Suspense } from 'react';
import { useUser } from '@/context/UserContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './styles.module.css';

function LoginForm() {
    const { login, signup, currentUser } = useUser();
    const router = useRouter();

    // Redirect if already logged in
    React.useEffect(() => {
        if (currentUser && (currentUser.role === 'engineer' || currentUser.role === 'admin')) {
            router.push('/dashboard');
        }
    }, [currentUser, router]);

    const searchParams = useSearchParams();
    const [isSignUp, setIsSignUp] = useState(searchParams.get('view') === 'signup');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            let res;
            if (isSignUp) {
                res = await signup(email, password, name);
            } else {
                res = await login(email, password);
            }

            if (res.error) {
                setError(res.error.message);
            } else {
                router.refresh();
                router.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                    <img
                        src="/mixnotes-logo.png"
                        alt="MixNotes"
                        width={200}
                        height={58}
                        style={{ objectFit: 'contain' }}
                    />
                </div>
                <h1 className={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
                <p className={styles.subtitle}>
                    {isSignUp ? 'Join as an Audio Engineer' : 'Sign in to access your account'}
                </p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {isSignUp && (
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Full Name</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Jane Doe"
                                required={isSignUp}
                            />
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email Address</label>
                        <input
                            type="email"
                            className={styles.input}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@studio.com"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Password</label>
                        <input
                            type="password"
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                            <Link href="/forgot-password" style={{ color: '#2563eb', fontSize: '0.85rem', textDecoration: 'none' }}>
                                Forgot password?
                            </Link>
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                        {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <div className={styles.footer}>
                    {isSignUp ? (
                        <>
                            Already have an account?{' '}
                            <button onClick={() => setIsSignUp(false)} className={styles.link}>
                                Sign In
                            </button>
                        </>
                    ) : (
                        <>
                            Don't have an account?{' '}
                            <button onClick={() => setIsSignUp(true)} className={styles.link}>
                                Create Account
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: '1rem', textAlign: 'center', width: '100%', color: '#94a3b8', fontSize: '0.8rem' }}>
                <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>← Back to Home</Link>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: 'white' }}>Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
