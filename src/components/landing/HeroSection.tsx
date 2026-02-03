import React from 'react';
import Link from 'next/link';
import styles from './styles.module.css';
import HeroDemoPlayer from './HeroDemoPlayer';

export default function HeroSection() {
    return (
        <section className={styles.heroSection}>
            <div className={styles.container}>
                <h1 className={styles.headingXl}>
                    Professional Audio Collaboration <br />
                    for Engineers & Artists
                </h1>
                <p className={styles.subheading}>
                    Streamline mix feedback, approvals, and project management. <br />
                    Replace messy emails and texts with clarity and speed.
                </p>

                <div style={{ marginTop: '2rem' }}>
                    <Link href="/signup" className={styles.btnPrimary}>
                        Start Free 1-Month Trial
                    </Link>
                    <Link href="/login" className={styles.btnSecondary}>
                        Already have an account? Login
                    </Link>
                </div>

                <div style={{ marginTop: '2rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <HeroDemoPlayer />
                </div>
            </div>
        </section>
    );
}
