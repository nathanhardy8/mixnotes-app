import React from 'react';
import { UploadCloud } from 'lucide-react';
import styles from './DropZoneOverlay.module.css';

interface DropZoneOverlayProps {
    isVisible: boolean;
}

export default function DropZoneOverlay({ isVisible }: DropZoneOverlayProps) {
    if (!isVisible) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.zone}>
                <UploadCloud className={styles.icon} />
                <h2 className={styles.text}>Drop audio files here to upload</h2>
                <p className={styles.subtext}>Supports MP3, WAV, FLAC, AAC, OGG, M4A</p>
            </div>
        </div>
    );
}
