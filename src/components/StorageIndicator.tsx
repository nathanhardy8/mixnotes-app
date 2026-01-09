'use client';

import React from 'react';
import { useUser } from '@/context/UserContext';
import styles from './StorageIndicator.module.css';
import { Cloud, HardDrive } from 'lucide-react';

interface StorageIndicatorProps {
    totalUsedBytes: number;
}

export default function StorageIndicator({ totalUsedBytes }: StorageIndicatorProps) {
    const { currentUser } = useUser();
    const isAdmin = currentUser?.role === 'admin';

    // Default Limit: 2TB (2 * 1024^4)
    const LIMIT_BYTES = 2 * 1024 * 1024 * 1024 * 1024;

    // Admin: Infinite or visual mock
    const effectiveLimit = isAdmin ? LIMIT_BYTES : LIMIT_BYTES;

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const percentUsed = Math.min(100, (totalUsedBytes / effectiveLimit) * 100);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.cloudIcon}>
                    <Cloud size={18} />
                </div>
                <div className={styles.textContainer}>
                    <span className={styles.label}>Storage</span>
                    <span className={styles.usage}>
                        {formatBytes(totalUsedBytes)} of {isAdmin ? 'Unlimited' : '2 TB'} used
                    </span>
                </div>
            </div>

            <div className={styles.progressBarBg}>
                <div
                    className={styles.progressBarFill}
                    style={{ width: `${percentUsed}%` }}
                />
            </div>

            {!isAdmin && (
                <button className={styles.upgradeBtn}>
                    Get more storage
                </button>
            )}
        </div>
    );
}
