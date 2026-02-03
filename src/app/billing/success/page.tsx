'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import styles from './styles.module.css';

export default function BillingSuccessPage() {
    const router = useRouter();
    const { refreshUser, currentUser } = useUser();
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        // Force refresh user to get updated subscription status
        refreshUser();

        // Redirect after a short delay
        const timeout = setTimeout(() => {
            router.push('/dashboard');
        }, 3000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [refreshUser, router]);

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div style={{ color: '#22c55e', fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
                <h1 className={styles.title}>You're all set</h1>
                <p className={styles.subtitle}>
                    We're finalizing your account setup{dots}
                </p>

                <button
                    onClick={() => router.push('/dashboard')}
                    className={styles.button}
                >
                    Continue to Dashboard
                </button>
            </div>
        </div>
    );
}
