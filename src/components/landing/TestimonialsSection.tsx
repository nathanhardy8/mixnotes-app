import React from 'react';
import styles from './styles.module.css';

const TestimonialCard = ({ quote, author, role }: { quote: string, author: string, role: string }) => (
    <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', border: '1px solid #334155' }}>
        <p style={{ fontSize: '1.1rem', fontStyle: 'italic', marginBottom: '1.5rem', color: '#cbd5e1' }}>
            &quot;{quote}&quot;
        </p>
        <div>
            <div style={{ fontWeight: 'bold', color: 'white' }}>{author}</div>
            <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{role}</div>
        </div>
    </div>
);

export default function TestimonialsSection() {
    return (
        <section className={styles.section} style={{ background: '#0f172a' }}>
            <div className={styles.container}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 className={styles.headingLg}>Trusted by Pros</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <TestimonialCard
                        quote="Mix Notes changed my life. I used to spend hours decoding client emails. Now I just look at the markers and fix the mix."
                        author="Alex T."
                        role="Mixing Engineer, Nashville"
                    />
                    <TestimonialCard
                        quote="The approval process is so much smoother. Clients feel involved and professional, and I get paid faster."
                        author="Marcus R."
                        role="Producer, London"
                    />
                    <TestimonialCard
                        quote="Finally, a tool that looks as good as it works. My clients are impressed every time I send a link."
                        author="Sarah J."
                        role="Mastering Engineer, LA"
                    />
                </div>
            </div>
        </section>
    );
}
