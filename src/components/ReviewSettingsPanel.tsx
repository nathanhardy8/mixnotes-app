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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <div className={styles.sidebarCardTitle} style={{ marginBottom: '0.25rem' }}>Client Sharing</div>
                    <div style={{
                        fontSize: '0.8rem',
                        color: project.approvalStatus === 'APPROVED' ? '#10b981' : 'var(--foreground-muted)',
                        fontWeight: 500
                    }}>
                        Status: {project.approvalStatus || 'PENDING'} {project.approvalStatus === 'APPROVED' && '✅'}
                    </div>
                </div>
                <label className={styles.toggleSwitch} style={{ transform: 'scale(0.9)', transformOrigin: 'right top' }}>
                    <input
                        type="checkbox"
                        checked={project.reviewEnabled || false}
                        onChange={(e) => handleToggleReview(e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                </label>
            </div>



            {/* Link Section */}
            {
                project.reviewEnabled && (
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-secondary)' }}>
                                ACCESS LINK
                            </span>
                            {linkData?.exists && linkData.url && (
                                <a
                                    href={linkData.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                                >
                                    Open <ExternalLink size={12} />
                                </a>
                            )}
                        </div>

                        {!project.clientId ? (
                            <div style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                Assign to client to share.
                            </div>
                        ) : (
                            <>
                                {linkData?.exists && linkData?.url ? (
                                    <div>
                                        <div style={{ display: 'flex' }}>
                                            <input
                                                readOnly
                                                value={linkData.url}
                                                className={styles.linkInput}
                                                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, background: 'var(--surface-hover)' }}
                                                onClick={(e) => e.currentTarget.select()}
                                            />
                                            <button
                                                onClick={() => copyToClipboard(linkData.url!)}
                                                style={{
                                                    background: copied ? '#10b981' : 'var(--surface-hover)',
                                                    border: '1px solid var(--border)',
                                                    borderLeft: 'none',
                                                    borderTopRightRadius: 'var(--radius)',
                                                    borderBottomRightRadius: 'var(--radius)',
                                                    padding: '0 12px',
                                                    cursor: 'pointer',
                                                    color: copied ? 'white' : 'var(--foreground-secondary)',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Copy Link"
                                            >
                                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center', color: 'var(--foreground-muted)', fontSize: '0.75rem' }}>
                                            <Share2 size={12} /> Directs to Client Folder
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                                        <button
                                            onClick={handleEnableAccess}
                                            disabled={loadingLink}
                                            style={{
                                                background: 'var(--primary)', color: 'white', border: 'none',
                                                borderRadius: '6px', padding: '6px 12px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600
                                            }}
                                        >
                                            {loadingLink ? 'Generating...' : 'Generate Access Link'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )
            }
        </div >
    );
}
