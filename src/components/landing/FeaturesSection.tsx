import React from 'react';
import styles from './styles.module.css';

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className={styles.featureCard}>
        <div className={styles.iconWrapper}>
            {icon}
        </div>
        <h3 className={styles.headingMd}>{title}</h3>
        <p style={{ color: '#ffffff', fontWeight: 500 }}>{description}</p>
    </div>
);

export default function FeaturesSection() {
    return (
        <section className={styles.section} style={{ background: '#0f172a' }}>
            <div className={styles.container}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 className={styles.headingLg}>Why Engineers Love Mix Notes</h2>
                    <p className={styles.subheading} style={{ margin: '0 auto' }}>
                        Everything you need to deliver professional mixes and get approved faster.
                    </p>
                </div>

                <div className={styles.featuresGrid}>
                    <FeatureCard
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
                        title="Timestamped Notes"
                        description="Clients accept or reject specific moments. Comments are pinned exactly where they happen on the waveform."
                    />
                    <FeatureCard
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
                        title="Simple Approvals"
                        description={'One-click approvals for clients. No more "is this the final version?" email threads.'}
                    />
                    <FeatureCard
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>}
                        title="Organized Projects"
                        description="Keep every mix version, reference track, and revision note in one dedicated, professional folder."
                    />
                    <FeatureCard
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>}
                        title="Professional Sharing"
                        description="Send secure magic links to clients. Control download permissions and access expiry."
                    />
                </div>
            </div>
        </section>
    );
}
