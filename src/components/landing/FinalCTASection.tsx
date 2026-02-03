import React from 'react';
import Link from 'next/link';
import styles from './styles.module.css';

export default function FinalCTASection() {
    return (
        <section className={styles.ctaSection}>
            <div className={styles.container}>
                <h2 className={styles.headingLg} style={{ color: 'white' }}>
                    Ready to streamline your mixing workflow?
                </h2>
                <Link href="/signup" className={styles.ctaBtn}>
                    Start Free 1-Month Trial
                </Link>
                <p style={{ marginTop: '1.5rem', color: '#bfdbfe', fontSize: '0.9rem' }}>
                    No card needed · Full access for 30 days
                </p>
            </div>
        </section>
    );
}
