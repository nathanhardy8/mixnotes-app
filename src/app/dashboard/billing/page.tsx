
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { billingService, EXEMPT_EMAIL } from '@/services/billingService';
import { Check, Loader, AlertTriangle, CreditCard, Calendar, ShieldCheck } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './styles.module.css'; // We'll create strict styles
import Link from 'next/link';

export default function BillingPage() {
    const { currentUser, trialStatus, refreshUser } = useUser();
    const [loading, setLoading] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    const [msg, setMsg] = useState(searchParams?.get('status') === 'success' ? 'Subscription active!' : '');

    useEffect(() => {
        if (searchParams?.get('status') === 'success') {
            refreshUser();
            router.replace('/dashboard/billing');
        }
    }, [searchParams]);

    if (!currentUser) return null;

    const sub = currentUser.subscription;
    const isExempt = currentUser.role === 'admin' || currentUser.email === EXEMPT_EMAIL || sub?.billingStatus === 'exempt';
    const isActive = sub?.billingStatus === 'active';
    const isTrialing = sub?.billingStatus === 'trialing' && !trialStatus.isExpired;
    const isPastDue = sub?.billingStatus === 'past_due';

    // Derived UI State
    let statusBadge = <span style={{ background: '#e2e8f0', color: '#475569', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem' }}>Inactive</span>;
    if (isExempt) statusBadge = <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 600 }}>Admin (Exempt)</span>;
    else if (isActive) statusBadge = <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 600 }}>Active — {sub?.planInterval === 'year' ? 'Annual' : 'Monthly'}</span>;
    else if (isTrialing) statusBadge = <span style={{ background: '#ffedd5', color: '#9a3412', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 600 }}>Free Trial — {trialStatus.daysRemaining} days left</span>;
    else if (isPastDue) statusBadge = <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 600 }}>Past Due</span>;
    else if (trialStatus.isExpired && !isActive) statusBadge = <span style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 600 }}>Trial Expired</span>;

    const handleStartTrial = async () => {
        if (loading) return;
        setLoading(true);
        const res = await fetch('/api/billing/start-trial', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            await refreshUser();
            setMsg('Free trial started!');
        } else {
            setMsg(data.error || 'Failed to start trial');
        }
        setLoading(false);
    };

    const handleSubscribe = async (plan: 'month' | 'year', provider: 'stripe' | 'paypal') => {
        if (loading) return;
        setLoading(true);
        const res = await billingService.createCheckoutSession(currentUser.id, plan, provider);
        if (res.url) {
            window.location.href = res.url;
        } else {
            setMsg(res.error || 'Checkout failed');
            setLoading(false);
        }
    };

    const handlePortal = async () => {
        if (loading) return;
        setLoading(true);
        const res = await billingService.getPortalLink();
        if (res.url) {
            // For checking mock
            if (res.url.includes('portal_demo')) {
                setMsg('Using Mock Portal (No active provider configured).');
                setLoading(false);
            } else {
                window.location.href = res.url;
            }
        }
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Billing</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {statusBadge}
                        {sub?.trialEndAt && isTrialing && (
                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Ends {new Date(sub.trialEndAt).toLocaleDateString()}</span>
                        )}
                    </div>
                </div>
            </div>

            {msg && (
                <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534' }}>
                    {msg}
                </div>
            )}

            {/* Trial Expired / Lock Message */}
            {(!isActive && !isTrialing && !isExempt && (sub?.trialUsed || trialStatus.isExpired)) && (
                <div style={{ padding: '1.5rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', color: '#9f1239', marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                    <AlertTriangle />
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Access Locked</div>
                        <div>Your free trial has ended. Please subscribe to continue accessing premium features.</div>
                    </div>
                </div>
            )}

            {/* Manage Section (If Subscribed/Trialing/Exempt) */}
            {(isActive || isTrialing) && !isExempt && (
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Subscription Details</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Plan</div>
                            <div style={{ fontWeight: 500 }}>{sub?.planInterval === 'year' ? 'Annual Pro' : 'Monthly Pro'}</div>
                        </div>
                        {isActive && (
                            <div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Renewal Date</div>
                                <div style={{ fontWeight: 500 }}>{sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '-'}</div>
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Provider</div>
                            <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{sub?.billingProvider || '-'}</div>
                        </div>
                    </div>
                    {isActive && (
                        <button
                            onClick={handlePortal}
                            className={styles.secondaryBtn}
                        >
                            Manage Billing
                        </button>
                    )}
                </div>
            )}

            {/* Plans */}
            {!isExempt && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    {/* Monthly */}
                    <div className={styles.planCard}>
                        <div className={styles.planHeader}>
                            <h3>Monthly</h3>
                            <div className={styles.price}>$20<span>/month</span></div>
                        </div>
                        <ul className={styles.features}>
                            <li><Check size={16} /> Unlimited Projects</li>
                            <li><Check size={16} /> Unlimited Storage</li>
                            <li><Check size={16} /> Client Review Portal</li>
                        </ul>
                        {!isActive && (
                            <div className={styles.actions}>
                                {(!sub?.trialUsed && !isTrialing) ? (
                                    <button onClick={handleStartTrial} disabled={loading} className={styles.primaryBtn}>
                                        {loading ? 'Processing...' : 'Start 1-Month Free Trial'}
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                        <button onClick={() => handleSubscribe('month', 'stripe')} disabled={loading} className={styles.primaryBtn}>
                                            Subscribe with Stripe
                                        </button>
                                        <button onClick={() => handleSubscribe('month', 'paypal')} disabled={loading} className={styles.secondaryBtn}>
                                            Subscribe with PayPal
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {isActive && sub?.planInterval === 'month' && (
                            <div className={styles.currentBadge}>Current Plan</div>
                        )}
                        {isActive && sub?.planInterval === 'year' && (
                            <button onClick={() => { }} disabled className={styles.secondaryBtn}>Switch to Monthly</button>
                        )}
                    </div>

                    {/* Annual */}
                    <div className={styles.planCard}>
                        {/* Best Value Badge */}
                        <div style={{ position: 'absolute', top: -12, right: 24, background: '#db2777', color: 'white', fontSize: '0.75rem', padding: '4px 12px', borderRadius: '12px', fontWeight: 600 }}>
                            BEST VALUE
                        </div>
                        <div className={styles.planHeader}>
                            <h3>Annual</h3>
                            <div className={styles.price}>$216<span>/year</span></div>
                            <div className={styles.savings}>Equivalent to $18/mo</div>
                        </div>
                        <ul className={styles.features}>
                            <li><Check size={16} /> All Pro features included</li>
                            <li><Check size={16} /> Save 10% vs Monthly</li>
                        </ul>
                        {!isActive && (
                            <div className={styles.actions}>
                                {(!sub?.trialUsed && !isTrialing) ? (
                                    <button onClick={handleStartTrial} disabled={loading} className={styles.secondaryBtn}>
                                        Start 1-Month Free Trial
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                        <button onClick={() => handleSubscribe('year', 'stripe')} disabled={loading} className={styles.primaryBtn}>
                                            Subscribe with Stripe (Yearly)
                                        </button>
                                        <button onClick={() => handleSubscribe('year', 'paypal')} disabled={loading} className={styles.secondaryBtn}>
                                            Subscribe with PayPal (Yearly)
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {isActive && sub?.planInterval === 'year' && (
                            <div className={styles.currentBadge}>Current Plan</div>
                        )}
                        {isActive && sub?.planInterval === 'month' && (
                            <button onClick={() => { }} disabled className={styles.secondaryBtn}>Switch to Annual</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
