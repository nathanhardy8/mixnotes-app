'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import styles from '../login/styles.module.css'; // Reusing login styles

export default function SignupPage() {
    const { signup, currentUser } = useUser();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Redirect if already logged in
    React.useEffect(() => {
        if (currentUser && (currentUser.role === 'engineer' || currentUser.role === 'admin')) {
            router.push('/dashboard');
        }
    }, [currentUser, router]);

    const handleGoogleLogin = async () => {
        const supabase = createClient();
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/complete-setup`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error) {
            setError(error.message);
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await signup(email, password, name);
            if (res.error) {
                setError(res.error.message);
                setIsLoading(false);
            } else {
                setIsSuccess(true);
                setIsLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className={styles.container}>
                <div className={styles.card} style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: '#ecfdf5',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </div>
                    </div>
                    <h1 className={styles.title}>Check Your Email</h1>
                    <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>
                        We've sent a confirmation link to <strong>{email}</strong>.<br />
                        Please click the link to verify your account.
                    </p>

                    <div className={styles.footer}>
                        <Link href="/login" className={styles.link}>
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

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
                <h1 className={styles.title}>Start Your Free Trial</h1>
                <p className={styles.subtitle}>
                    Create your account to get started.
                </p>

                {error && <div className={styles.error}>{error}</div>}

                <div style={{ marginBottom: '1.5rem' }}>
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className={styles.submitBtn}
                        style={{ backgroundColor: 'white', color: '#1e293b', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%' }}
                        disabled={isLoading}
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" alt="Google" />
                        Continue with Google
                    </button>
                    <div style={{ margin: '1.5rem 0', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', position: 'relative' }}>
                        <span style={{ background: 'var(--surface)', padding: '0 10px', position: 'relative', zIndex: 1 }}>OR</span>
                        <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '1px', background: '#e2e8f0', zIndex: 0 }}></div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Full Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Jane Doe"
                            required
                        />
                    </div>

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
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'Continue'}
                    </button>
                </form>

                <div className={styles.footer}>
                    Already have an account?{' '}
                    <Link href="/login" className={styles.link}>
                        Sign In
                    </Link>
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: '1rem', textAlign: 'center', width: '100%', color: '#94a3b8', fontSize: '0.8rem' }}>
                <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>← Back to Home</Link>
            </div>
        </div>
    );
}
