import React from 'react';
import Link from 'next/link';
import styles from './styles.module.css';

export default function PricingSection() {
    return (
        <section className={`${styles.section} ${styles.pricingSection}`}>
            <div className={styles.container}>
                <h2 className={styles.headingLg}>Simple, Transparent Pricing</h2>
                <p className={styles.subheading} style={{ margin: '0 auto' }}>
                    Choose the plan that fits your studio needs.
                </p>

                <div className={styles.pricingGrid}>
                    {/* Basic Plan */}
                    <div className={styles.pricingCard}>
                        <h3 className={styles.headingMd}>Engineer Basic</h3>
                        <div className={styles.price}>
                            $12<span className={styles.pricePeriod}>/mo</span>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
                            Everything you need to get started.
                        </p>

                        <div style={{ textAlign: 'left', marginBottom: '2rem', flex: 1 }}>
                            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> 50 GB Storage
                            </div>
                            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> Unlimited Projects
                            </div>
                            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> Client Review Portal
                            </div>
                            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> High-Res Audio Support
                            </div>
                        </div>

                        <Link href="/login?view=signup" className={styles.btnPrimary} style={{ width: '100%' }}>
                            Start 1-Month Free Trial
                        </Link>
                        <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                            Cancel anytime
                        </p>
                    </div>

                    {/* PRO Plan */}
                    <div className={styles.pricingCard} style={{ opacity: 0.8, borderColor: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                            COMING SOON
                        </div>
                        <h3 className={styles.headingMd}>Engineer Pro</h3>
                        <div className={styles.price}>
                            $21<span className={styles.pricePeriod}>/mo</span>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
                            For power users who need more.
                        </p>

                        <div style={{ textAlign: 'left', marginBottom: '2rem', flex: 1 }}>
                            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> <strong>100 GB Storage</strong>
                            </div>
                            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> <strong>AI Mix Assistant</strong>
                            </div>
                            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> Priority Support
                            </div>
                            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> Everything in Basic
                            </div>
                        </div>

                        <button disabled className={styles.btnSecondary} style={{ width: '100%', cursor: 'not-allowed', opacity: 0.5, borderColor: '#334155' }}>
                            Join Waitlist
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
