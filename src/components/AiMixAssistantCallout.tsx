import React from 'react';
import { Sparkles } from 'lucide-react';
import styles from './AiMixAssistantCallout.module.css';

export default function AiMixAssistantCallout() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <Sparkles size={16} strokeWidth={2} style={{ color: '#6366f1' }} /> {/* Indigo-500 for a subtle AI feel */}
                    <h3 className={styles.title}>AI Mix Assistant</h3>
                    <span className={styles.badge}>Coming soon</span>
                </div>
            </div>
            <p className={styles.description}>
                Get AI-powered mix feedback and actionable suggestions right inside MixNotes.
            </p>
        </div>
    );
}
