'use client';

import { useState, useEffect } from 'react';
import styles from './UploadModal.module.css'; // Reuse upload styles for consistency

interface RenameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRename: (newTitle: string) => Promise<void>;
    currentTitle: string;
}

export default function RenameModal({ isOpen, onClose, onRename, currentTitle }: RenameModalProps) {
    const [title, setTitle] = useState(currentTitle);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setTitle(currentTitle);
    }, [currentTitle]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsLoading(true);
        await onRename(title);
        setIsLoading(false);
        onClose();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h2 className={styles.title}>Rename Project</h2>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Project Title</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter new title"
                            autoFocus
                        />
                    </div>
                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.submitBtn} disabled={isLoading || !title.trim()}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
