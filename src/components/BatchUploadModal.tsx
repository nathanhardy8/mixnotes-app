import React, { useState, useEffect } from 'react';
import styles from './BatchUploadModal.module.css';
import { Client } from '@/types';
import { Loader, CheckCircle, AlertCircle, Plus } from 'lucide-react';

interface BatchUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    files: File[];
    clients: Client[];
    initialClientId?: string | null;
    defaultRevisionLimit?: number | null;
    onUpload: (items: { file: File, title: string, clientId: string, revisionLimit: number | null }[]) => Promise<void>;
    onCreateClient: () => Promise<Client | null>;
}

interface FileMeta {
    file: File;
    title: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

export default function BatchUploadModal({
    isOpen,
    onClose,
    files,
    clients,
    initialClientId,
    defaultRevisionLimit,
    onUpload,
    onCreateClient
}: BatchUploadModalProps) {
    const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || '');
    const [fileMetas, setFileMetas] = useState<FileMeta[]>([]);
    const [isGlobalUploading, setIsGlobalUploading] = useState(false);

    // Revision State
    const [isUnlimited, setIsUnlimited] = useState(true);
    const [limit, setLimit] = useState(3);

    // Initialize defaults
    useEffect(() => {
        if (isOpen) {
            if (defaultRevisionLimit !== undefined && defaultRevisionLimit !== null) {
                setIsUnlimited(false);
                setLimit(defaultRevisionLimit);
            } else {
                setIsUnlimited(true);
            }
        }
    }, [isOpen, defaultRevisionLimit]);

    // Initialize state when files change
    useEffect(() => {
        if (isOpen) {
            // If files provided via props (Drag Drop), use them.
            // If not, we wait for user to select in modal.
            if (files.length > 0) {
                setFileMetas(files.map(f => ({
                    file: f,
                    title: f.name.replace(/\.[^/.]+$/, ""), // Remove extension
                    status: 'pending'
                })));
            } else {
                setFileMetas([]); // Reset if opening empty
            }
            if (initialClientId) setSelectedClientId(initialClientId);
        }
    }, [isOpen, files, initialClientId]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFileMetas(prev => [
                ...prev,
                ...newFiles.map(f => ({
                    file: f,
                    title: f.name.replace(/\.[^/.]+$/, ""),
                    status: 'pending' as const
                }))
            ]);
        }
    };

    if (!isOpen) return null;

    const handleTitleChange = (index: number, newTitle: string) => {
        const newMetas = [...fileMetas];
        newMetas[index].title = newTitle;
        setFileMetas(newMetas);
    };

    const handleUploadClick = async () => {
        if (!selectedClientId) {
            alert("Please select a client.");
            return;
        }

        setIsGlobalUploading(true);

        // Prepare items
        // Prepare items
        const finalLimit = isUnlimited ? null : limit;

        const itemsToUpload = fileMetas.map(meta => ({
            file: meta.file,
            title: meta.title,
            clientId: selectedClientId,
            revisionLimit: finalLimit
        }));

        // We delegate the actual upload loop to the parent to handle context updates,
        // but for visual progress we might want to do it here or allow the parent to update status.
        // For simplicity in this "Batch" context, we'll await the parent's generic promise
        // assuming the parent handles the "one-by-one" or "all-at-once" logic and we just show a loader.
        // A better UX would be per-item progress, but let's start with a global loader for the MVP batch.

        try {
            await onUpload(itemsToUpload);
            onClose(); // Close on success
        } catch (e) {
            alert("Some uploads failed. Please check the list.");
            setIsGlobalUploading(false);
        }
    };

    const handleCreateClientClick = async () => {
        const newClient = await onCreateClient();
        if (newClient) {
            setSelectedClientId(newClient.id);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {fileMetas.length === 0 ? 'Create New Project' : `Upload ${fileMetas.length} Project${fileMetas.length !== 1 ? 's' : ''}`}
                    </h2>
                    <p className={styles.subtitle}>Review project details before uploading.</p>
                </div>

                <div className={styles.content}>
                    {/* Client Selection */}
                    {!initialClientId && (
                        <div>
                            <label className={styles.sectionTitle}>Select Client Folder</label>
                            <div className={styles.selectGroup}>
                                <select
                                    className={styles.select}
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                    disabled={isGlobalUploading}
                                >
                                    <option value="">-- Choose a Client --</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className={`btn-secondary ${styles.newClientBtn}`}
                                    onClick={handleCreateClientClick}
                                    disabled={isGlobalUploading}
                                >
                                    <Plus size={16} /> New Client
                                </button>
                            </div>
                        </div>
                    )}

                    {/* File Selection (Empty State) or List */}
                    {fileMetas.length === 0 ? (
                        <div className={styles.emptyDropZone}>
                            <input
                                type="file"
                                accept="audio/*"
                                multiple
                                onChange={handleFileSelect}
                                id="modal-file-input"
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="modal-file-input" className="btn-primary" style={{ cursor: 'pointer' }}>
                                Choose Audio Files
                            </label>
                            <p style={{ marginTop: '1rem', color: 'var(--foreground-secondary)', fontSize: '0.9rem' }}>
                                or drag and drop files here
                            </p>
                        </div>
                    ) : (
                        /* File List */
                        <div className={styles.fileList}>
                            {fileMetas.map((meta, idx) => (
                                <div key={idx} className={styles.fileItem}>
                                    <div className={styles.fileHeader}>
                                        <span className={styles.fileName}>{meta.file.name}</span>
                                        <span className={styles.fileSize}>{(meta.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Project Title</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={meta.title}
                                            onChange={(e) => handleTitleChange(idx, e.target.value)}
                                            disabled={isGlobalUploading}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Revision Settings (Only show if we have files to Configure) */}
                    {fileMetas.length > 0 && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)' }}>
                            <label className={styles.sectionTitle}>Revision Limit</label>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                                <input
                                    type="checkbox"
                                    checked={isUnlimited}
                                    onChange={(e) => setIsUnlimited(e.target.checked)}
                                    id="batch-unlimited-check"
                                    style={{ marginRight: '8px' }}
                                />
                                <label htmlFor="batch-unlimited-check" style={{ cursor: 'pointer', color: 'var(--foreground)', marginRight: '16px' }}>
                                    Unlimited Revisions
                                </label>

                                {!isUnlimited && (
                                    <>
                                        <span style={{ marginRight: '8px', color: 'var(--foreground-secondary)' }}>Limit to:</span>
                                        <input
                                            type="number"
                                            value={limit}
                                            onChange={e => setLimit(Math.max(1, parseInt(e.target.value) || 0))}
                                            min="1"
                                            style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    <button
                        onClick={onClose}
                        className={styles.btnCancel}
                        disabled={isGlobalUploading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUploadClick}
                        className="btn-primary"
                        disabled={isGlobalUploading || !selectedClientId || fileMetas.length === 0}
                    >
                        {isGlobalUploading ? (
                            <>
                                <Loader className="animate-spin" size={16} /> Uploading...
                            </>
                        ) : (
                            `Upload ${files.length} Projects`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
