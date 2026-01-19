import React from 'react';
import { AlertCircle, CheckCircle, Send, Edit3, Lock } from 'lucide-react';
import styles from './RevisionBar.module.css';
import { RoundStatus } from '@/types';

interface RevisionBarProps {
    status?: RoundStatus; // defined in types
    isClient: boolean;
    isActiveVersion: boolean; // Is the viewed version the one this round belongs to?
    isLatestVersion: boolean; // Can only start rounds on latest? Usually yes.

    draftCommentCount: number;

    onStart: () => void;
    onSubmit: () => void;

    // Limits
    revisionLimit?: number | null;
    revisionsUsed: number;
}

export default function RevisionBar({
    status,
    isClient,
    isActiveVersion,
    isLatestVersion,
    draftCommentCount,
    onStart,
    onSubmit,
    revisionLimit,
    revisionsUsed
}: RevisionBarProps) {

    // If engineer, we might see different things?
    // Engineer just sees status.

    if (!isClient) {
        // Engineer View
        if (!status) return null; // Nothing to show if no round
        return (
            <div className={`${styles.container} ${status === 'submitted' ? styles.submitted : ''}`}>
                <div className={styles.info}>
                    <div className={styles.title}>
                        {status === 'submitted' ? <CheckCircle size={16} color="green" /> : <Edit3 size={16} />}
                        Revision Round: {status.charAt(0).toUpperCase() + status.slice(1)}
                    </div>
                </div>
                {status === 'submitted' && (
                    <div className={styles.badge + ' ' + styles.badgeSubmitted}>
                        Action Required
                    </div>
                )}
            </div>
        );
    }

    // Client View

    // 1. No Active Round
    if (!status) {
        if (!isLatestVersion) return null;

        // Check Limit
        const isLimitReached = revisionLimit !== null && revisionLimit !== undefined && revisionsUsed >= revisionLimit;

        return (
            <div className={styles.container}>
                <div className={styles.info}>
                    <div className={styles.title}>
                        <Edit3 size={18} />
                        Start a Revision
                    </div>
                    <div className={styles.subtitle}>
                        {isLimitReached
                            ? `You have used all ${revisionLimit} revisions.`
                            : "Compile your feedback into a revision round."
                        }
                    </div>
                </div>
                <div className={styles.actions}>
                    {!isLimitReached ? (
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onStart}>
                            Start Revision Round
                        </button>
                    ) : (
                        <div style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>
                            Limit Reached ({revisionsUsed}/{revisionLimit})
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. Draft Round
    if (status === 'draft') {
        return (
            <div className={`${styles.container} ${styles.draft}`}>
                <div className={styles.info}>
                    <div className={styles.title}>
                        <Edit3 size={18} color="#d97706" />
                        In Revision Mode
                    </div>
                    <div className={styles.subtitle}>
                        You have {draftCommentCount} comments in this round.
                    </div>
                </div>
                <div className={styles.actions}>
                    <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={onSubmit}
                        disabled={draftCommentCount === 0}
                        title={draftCommentCount === 0 ? "Add comments first" : "Submit to Engineer"}
                    >
                        Submit Feedback <Send size={16} style={{ marginLeft: 6 }} />
                    </button>
                </div>
            </div>
        );
    }

    // 3. Submitted Round
    if (status === 'submitted') {
        return (
            <div className={`${styles.container} ${styles.submitted}`}>
                <div className={styles.info}>
                    <div className={styles.title}>
                        <CheckCircle size={18} color="#059669" />
                        Feedback Submitted
                    </div>
                    <div className={styles.subtitle}>
                        Your engineer has been notified.
                    </div>
                </div>
                <div className={styles.badge + ' ' + styles.badgeSubmitted}>
                    Sent
                </div>
            </div>
        );
    }

    return null;
}
