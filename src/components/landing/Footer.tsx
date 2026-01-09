import React from 'react';
import Link from 'next/link';
import styles from './styles.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.footerLinks}>
                    <Link href="#" className={styles.footerLink}>Privay Policy</Link>
                    <Link href="#" className={styles.footerLink}>Terms of Service</Link>
                    <Link href="#" className={styles.footerLink}>Contact Support</Link>
                </div>
                <p>&copy; {new Date().getFullYear()} Mix Notes. All rights reserved.</p>
            </div>
        </footer>
    );
}
