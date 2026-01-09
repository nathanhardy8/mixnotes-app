import React from 'react';
import Link from 'next/link';
import styles from './styles.module.css';

export default function PricingSection() {
    return (
        <section className={`${styles.section} ${styles.pricingSection}`}>
            <div className={styles.container}>
                <h2 className={styles.headingLg}>Simple, Transparent Pricing</h2>
                <p className={styles.subheading} style={{ margin: '0 auto' }}>
                    One plan. All features. Unlimited projects.
                </p>

                <div className={styles.pricingCard}>
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#3b82f6', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                        MOST POPULAR
                    </div>
                    <h3 className={styles.headingMd}>Pro Engineer</h3>
                    <div className={styles.price}>
                        $20<span className={styles.pricePeriod}>/mo</span>
                    </div>
                    <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '2rem' }}>
                        or $18/mo billed annually
                    </p>

                    <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
                        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                            <span style={{ color: '#3b82f6' }}>✓</span> Unlimited Projects
                        </div>
                        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                            <span style={{ color: '#3b82f6' }}>✓</span> Unlimited Storage
                        </div>
                        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                            <span style={{ color: '#3b82f6' }}>✓</span> High-Res Audio Support
                        </div>
                        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                            <span style={{ color: '#3b82f6' }}>✓</span> Client Management
                        </div>
                    </div>

                    <Link href="/login?view=signup" className={styles.btnPrimary} style={{ width: '100%' }}>
                        Start 1-Month Free Trial
                    </Link>
                    <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                        No credit card required • Cancel anytime
                    </p>
                </div>
            </div>
        </section>
    );
}
