'use client';

import { useState, useEffect } from 'react';
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { Project } from '@/types';
import { projectService } from '@/services/projectService';
import { clientService } from '@/services/clientService';
import styles from '@/app/projects/[id]/styles.module.css';

interface ClientSharingPanelProps {
    project: Project;
    onUpdate: (updates: Partial<Project>) => void;
}

export default function ClientSharingPanel({ project, onUpdate }: ClientSharingPanelProps) {
    const [loadingLink, setLoadingLink] = useState(false);
    const [linkData, setLinkData] = useState<{ url?: string; exists: boolean } | null>(null);
    const [copied, setCopied] = useState(false);

    // Initial load of link status
    useEffect(() => {
        if (project.clientId) {
            loadLinkStatus();
        }
    }, [project.clientId]);

    const loadLinkStatus = async () => {
        if (!project.clientId) return;
        const status = await clientService.getFolderLinkStatus(project.clientId);
        setLinkData(status as any);
    };

    const handleToggleReview = async (enabled: boolean) => {
        // Optimistic update
        onUpdate({ reviewEnabled: enabled });
        const success = await projectService.updateProject(project.id, { reviewEnabled: enabled });
        if (!success) onUpdate({ reviewEnabled: !enabled }); // Rollback
    };

    const handleEnableAccess = async () => {
        if (!project.clientId) return;
        setLoadingLink(true);
        const res = await clientService.toggleFolderLink(project.clientId, 'enable');
        if (res.success && res.url) {
            setLinkData({ exists: true, url: res.url });
        } else {
            alert('Failed to enable access link');
        }
        setLoadingLink(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            prompt("Copy link manually:", text);
        });
    };

    return (
        <div className={styles.sidebarCard}>
            <div className={styles.controlRow}>
                <div className={styles.sidebarCardTitle}>Comments & Review</div>
                <label className={styles.toggleSwitch} style={{ transform: 'scale(0.9)', transformOrigin: 'right center' }}>
                    <input
                        type="checkbox"
                        checked={project.reviewEnabled || false}
                        onChange={(e) => handleToggleReview(e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                </label>
            </div>
            <div style={{
                fontSize: '0.75rem',
                color: project.approvalStatus === 'APPROVED' ? '#10b981' : 'var(--foreground-muted)',
                marginBottom: '0.5rem',
                display: 'flex', alignItems: 'center', gap: '4px'
            }}>
                Status: <span style={{ fontWeight: 600 }}>{project.approvalStatus || 'PENDING'}</span> {project.approvalStatus === 'APPROVED' && '✅'}
            </div>



            {/* Link Section */}
            {
                project.reviewEnabled && (
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ marginTop: '0.5rem' }}>
                            {!project.clientId ? (
                                <div style={{ color: 'var(--foreground-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                    Assign to client to share.
                                </div>
                            ) : (
                                <>
                                    {linkData?.exists && linkData?.url ? (
                                        <div>
                                            <div style={{ display: 'flex', height: '32px' }}>
                                                <input
                                                    readOnly
                                                    value={linkData.url}
                                                    className={styles.linkInput}
                                                    style={{
                                                        borderTopRightRadius: 0, borderBottomRightRadius: 0,
                                                        background: 'var(--surface-active)', fontSize: '0.8rem', padding: '0 8px'
                                                    }}
                                                    onClick={(e) => e.currentTarget.select()}
                                                />
                                                <button
                                                    onClick={() => copyToClipboard(linkData.url!)}
                                                    style={{
                                                        background: copied ? 'var(--primary)' : 'var(--surface)',
                                                        border: '1px solid var(--border)',
                                                        borderLeft: 'none',
                                                        borderTopRightRadius: '4px',
                                                        borderBottomRightRadius: '4px',
                                                        padding: '0 10px',
                                                        cursor: 'pointer',
                                                        color: copied ? 'white' : 'var(--foreground)',
                                                        transition: 'all 0.2s',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                    title="Copy Link"
                                                >
                                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', alignItems: 'center' }}>
                                                <a
                                                    href={linkData.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                                                >
                                                    <ExternalLink size={10} /> Open Client View
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '0.25rem 0' }}>
                                            <button
                                                onClick={handleEnableAccess}
                                                disabled={loadingLink}
                                                style={{
                                                    background: 'var(--surface)', color: 'var(--primary)', border: '1px solid var(--primary)',
                                                    borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600,
                                                    width: '100%'
                                                }}
                                            >
                                                {loadingLink ? '...' : 'Create Link'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )
            }
        </div>
    );
}
