import React from 'react';
import styles from './styles.module.css';

export default function HowItWorksSection() {
    return (
        <section className={`${styles.section} ${styles.howItWorksSection}`}>
            <div className={styles.container}>


                <div className={styles.splitLayout}>
                    <div className={styles.splitContent}>
                        <h2 className={styles.headingLg}>For Engineers: Control Your Workflow</h2>
                        <p className={styles.subheading}>
                            Stop chasing feedback across WhatsApp, Email, and Instagram.
                            Upload your mix, send a link, and get clear, timestamped notes in one place.
                        </p>
                        <ul style={{ listStyle: 'none', padding: 0, color: '#ffffff' }}>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> Manage multiple clients easily
                            </li>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> Version control built-in
                            </li>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> Look 10x more professional
                            </li>
                        </ul>
                    </div>
                    <div className={styles.splitVisual} style={{ background: 'transparent', border: 'none', height: 'auto', padding: 0 }}>
                        <img
                            src="/images/dashboard-mockup.png"
                            alt="Dashboard Interface"
                            style={{ width: '100%', height: 'auto', borderRadius: '12px', boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)' }}
                        />
                    </div>
                </div>

                <div className={styles.splitLayout}>
                    <div className={styles.splitContent}>
                        <h2 className={styles.headingLg}>For Artists: Clear & Easy Feedback</h2>
                        <p className={styles.subheading}>
                            No more typing &quot;at 2:43 the snare is too loud&quot;. Just click on the waveform and type.
                            Listen on your phone, tablet, or studio monitors.
                        </p>
                        <ul style={{ listStyle: 'none', padding: 0, color: '#ffffff' }}>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> No login required for clients
                            </li>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> Mobile-friendly player
                            </li>
                            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: '#2563eb' }}>✓</span> One-tap approval
                            </li>
                        </ul>
                    </div>
                    <div className={styles.splitVisual} style={{ background: 'transparent', border: 'none', height: 'auto', padding: 0 }}>
                        <img
                            src="/images/player-mockup.png"
                            alt="Mobile Player Interface"
                            style={{ width: '100%', height: 'auto', borderRadius: '12px', boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)' }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
