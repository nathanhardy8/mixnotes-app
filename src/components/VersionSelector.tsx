import React from 'react';
import styles from './VersionSelector.module.css';
import { ProjectVersion } from '@/types';

interface VersionSelectorProps {
    versions: ProjectVersion[];
    activeVersionId: string | null;
    onSelect: (versionId: string) => void;
    latestVersionId?: string;
}

export default function VersionSelector({
    versions,
    activeVersionId,
    onSelect,
    latestVersionId
}: VersionSelectorProps) {

    // Sort versions by version number (descending usually, or ascending? Layout usually implies left-to-right. 
    // Image shows Mix_v1.0 then Mix_v1.1. So Ascending seems natural for tabs reading left to right)
    // BUT usually latest is most important. 
    // Let's sort Ascending (v1, v2, v3) based on the image provided.
    const sortedVersions = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);

    return (
        <div className={styles.container}>
            {sortedVersions.map((version) => {
                const isActive = activeVersionId === version.id;
                const isLatest = version.id === latestVersionId || version.versionNumber === Math.max(...versions.map(v => v.versionNumber));

                // Determine label. Use originalFilename or fallback to "Version X"
                // Clean up filename if needed (remove extension if strictly desired, but image shows .mp3)
                // "Mix_v1.0.mp3"
                const label = version.originalFilename || `Version ${version.versionNumber}`;

                return (
                    <button
                        key={version.id}
                        className={`${styles.tab} ${isActive ? styles.active : ''}`}
                        onClick={() => onSelect(version.id)}
                    >
                        {label}
                        {isActive && <span className={styles.badge}>Current</span>}
                        {/* 
                            Note: Image shows "Current" badge on the ACTIVE tab. 
                            Or does it mean "Current" as in "Latest"? 
                            The request says "Mix_v1.1_final.mp3 [Current]". And that tab is selected (blue underline).
                            Wait, usually "Current" implies "Latest Version". 
                            If I click v1.0, should the badge move? 
                            "Current" usually means "This is the active one you are listening to".
                            Let's assume Badge = Active Indicator text alongside the underline.
                        */}
                    </button>
                );
            })}
        </div>
    );
}
