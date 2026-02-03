'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { billingService } from '@/services/billingService';
import styles from './styles.module.css';

export default function CompleteSetupPage() {
    const { currentUser, isLoading: userLoading } = useUser();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        // Guard: If not logged in, redirect to login
        if (!userLoading && !currentUser) {
            router.push('/login');
        }
        // Guard: If already has active subscription, go to dashboard
        // Wait, "Account is LOCKED until billing completes". 
        // If they are active/trialing, let them in.
        if (currentUser?.subscription?.billingStatus === 'active' || currentUser?.subscription?.billingStatus === 'trialing') {
            // router.push('/dashboard'); 
            // Commented out to prevent infinite loops if status isn't syncing fast enough, 
            // but technically they shouldn't be here.
            // Leaving it open for now or we will duplicate the middleware logic.
        }
    }, [currentUser, userLoading, router]);

    const handleSelectPlan = async (planId: 'engineer_basic' | 'engineer_pro') => {
        setIsLoading(true);
        setError('');

        // Call API to create checkout session/subscription
        const res = await billingService.createCheckoutSession(
            currentUser!.id,
            planId,
            'month',
            'stripe'
        );

        if (res.error) {
            setError(res.error);
            setIsLoading(false);
        } else if (res.url) {
            // Force a user refresh to pick up the new "engineer" role and subscription
            // This prevents the dashboard from thinking we are still a restricted user
            // We can use a full reload to be extra safe, or rely on context.
            // Full reload (window.location.href) is generally safer for role changes.
            window.location.href = res.url;
        }
    };

    if (userLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white' }}>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Choose Your Plan</h1>
                <p className={styles.subtitle}>Start your 30-day free trial. Cancel anytime.</p>
                {error && <div className={styles.error}>{error}</div>}
            </div>

            <div className={styles.grid}>
                {/* Basic Plan */}
                <div className={styles.card}>
                    <h2 className={styles.planName}>Basic</h2>
                    <div className={styles.price}>
                        $12<span className={styles.period}>/mo</span>
                    </div>
                    <p className={styles.description}>Free for 1 month.<br />50 GB Storage.</p>

                    <ul className={styles.features}>
                        <li>50 GB Storage</li>
                        <li>Unlimited Projects</li>
                        <li>Client Reviews</li>
                    </ul>

                    <button
                        onClick={() => handleSelectPlan('engineer_basic')}
                        className={styles.button}
                        disabled={isLoading}
                    >
                        Start Free Trial
                    </button>
                    <p className={styles.microcopy}>No credit card required.</p>
                </div>

                {/* Pro Plan */}
                <div className={`${styles.card} ${styles.proCard}`}>
                    <div className={styles.badge}>RECOMMENDED</div>
                    <h2 className={styles.planName}>Pro</h2>
                    <div className={styles.price}>
                        $22<span className={styles.period}>/mo</span>
                    </div>
                    <p className={styles.description}>Free for 1 month.<br />100 GB Storage + AI.</p>

                    <ul className={styles.features}>
                        <li>100 GB Storage</li>
                        <li>Unlimited Projects</li>
                        <li>
                            AI Mix Assistant
                            <span className={styles.comingSoon}>Coming Soon</span>
                        </li>
                    </ul>

                    <button
                        onClick={() => handleSelectPlan('engineer_pro')}
                        className={`${styles.button} ${styles.proButton}`}
                        disabled={isLoading}
                    >
                        Start Free Trial
                    </button>
                    <p className={styles.microcopy}>No credit card required.</p>
                </div>
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                Cancel anytime — keep access until your trial ends.
            </div>
        </div>
    );
}
