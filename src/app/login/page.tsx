'use client';

import React, { useState, Suspense } from 'react';
import { useUser } from '@/context/UserContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import styles from './styles.module.css';

import { getFriendlyErrorMessage, validateEmail, validatePassword } from '@/utils/auth-helpers';

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

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // Validation & Errors
    const [touched, setTouched] = useState({ email: false, password: false, name: false });
    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [globalError, setGlobalError] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    // Validate on change if touched
    React.useEffect(() => {
        if (touched.email) setEmailError(validateEmail(email));
        if (touched.password) setPasswordError(validatePassword(password));
    }, [email, password, touched]);

    const handleGoogleLogin = async () => {
        const supabase = createClient();
        setIsLoading(true);
        setGlobalError('');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
                queryParams: { access_type: 'offline', prompt: 'consent' },
            },
        });
        if (error) {
            setGlobalError(getFriendlyErrorMessage(error));
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGlobalError('');

        // Validate all
        const eErr = validateEmail(email);
        const pErr = validatePassword(password);

        setEmailError(eErr);
        setPasswordError(pErr);
        setTouched({ email: true, password: true, name: true });

        if (eErr || pErr) return;
        if (isSignUp && !name) return; // Basic check for name

        setIsLoading(true);

        try {
            let res;
            if (isSignUp) {
                res = await signup(email, password, name);
            } else {
                res = await login(email, password);
            }

            if (res.error) {
                setGlobalError(getFriendlyErrorMessage(res.error));
                setIsLoading(false); // Only stop loading on error, let redirect happen otherwise
            } else {
                router.refresh();
                if (isSignUp) {
                    // Should be handled by SignupPage actually, but if we route here...
                    // Wait, Signup logic is mostly in /signup/page.tsx. 
                    // This component handles BOTH?
                    // The current /login page imports this form which handles toggling
                    // But /signup is a separate page. 
                    // I should simplify this form to mostly handle Login if it's on /login, 
                    // or redirect to /signup if user switches mode.
                    // The existing code toggles `isSignUp`. I will respect that.
                    router.push(isSignUp ? '/complete-setup' : '/dashboard');
                } else {
                    router.push('/dashboard');
                }
            }
        } catch (err: any) {
            setGlobalError('An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    // Helper to toggle mode
    const toggleMode = (mode: boolean) => {
        setIsSignUp(mode);
        setGlobalError('');
        setEmailError(null);
        setPasswordError(null);
        setTouched({ email: false, password: false, name: false });
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

                {globalError && (
                    <div className={styles.error} role="alert" aria-live="polite">
                        {globalError}
                    </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className={styles.submitBtn}
                        style={{ backgroundColor: 'white', color: '#1e293b', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', opacity: isLoading ? 0.7 : 1 }}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span>Working...</span>
                        ) : (
                            <>
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" alt="Google" />
                                Continue with Google
                            </>
                        )}
                    </button>
                    <div style={{ margin: '1.5rem 0', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', position: 'relative' }}>
                        <span style={{ background: 'var(--surface)', padding: '0 10px', position: 'relative', zIndex: 1 }}>OR</span>
                        <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '1px', background: '#e2e8f0', zIndex: 0 }}></div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.form} noValidate>
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
                                disabled={isLoading}
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
                            onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                            placeholder="you@studio.com"
                            required
                            disabled={isLoading}
                            style={{ borderColor: emailError ? '#ef4444' : '' }}
                            aria-invalid={!!emailError}
                        />
                        {emailError && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{emailError}</span>}
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Password</label>
                        <input
                            type="password"
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                            style={{ borderColor: passwordError ? '#ef4444' : '' }}
                            aria-invalid={!!passwordError}
                        />
                        {passwordError && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{passwordError}</span>}

                        {!isSignUp && (
                            <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                                <Link href="/forgot-password" className={styles.link} tabIndex={isLoading ? -1 : 0}>
                                    Forgot password?
                                </Link>
                            </div>
                        )}
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={isLoading || (!!emailError || !!passwordError)}>
                        {isLoading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <div className={styles.footer}>
                    {isSignUp ? (
                        <>
                            Already have an account?{' '}
                            <button onClick={() => toggleMode(false)} className={styles.link} disabled={isLoading}>
                                Sign In
                            </button>
                        </>
                    ) : (
                        <>
                            Don't have an account?{' '}
                            <button onClick={() => toggleMode(true)} className={styles.link} disabled={isLoading}>
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

import ShaderBackground from '@/components/ui/shader-background.client';

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: 'white' }}>Loading...</div>}>
            <div className="relative min-h-screen">
                <ShaderBackground />
                <div className="relative z-10">
                    <LoginForm />
                </div>
            </div>
        </Suspense>
    );
}
