'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Lock, Download, ArrowLeft, ChevronDown, ChevronUp, Share2, Copy, RefreshCw, Check, Upload } from 'lucide-react';
import { createPortal } from 'react-dom';
import AudioPlayer from '@/components/AudioPlayer';
import CommentSidebar from '@/components/CommentSidebar';
import VersionSelector from '@/components/VersionSelector';
import ClientSharingPanel from '@/components/ReviewSettingsPanel';
import Toast from '@/components/Toast';
import styles from './ProjectView.module.css';
import { Comment, Project, User } from '@/types';
import { useAudioShortcuts } from '@/hooks/useAudioShortcuts';
import VersionManager from '@/components/VersionManager';

import { RevisionRound } from '@/types';

export interface ProjectViewProps {
    project: Project;
    comments: Comment[];
    currentUser?: User | null;
    role: 'engineer' | 'client';

    // Player State
    activeVersionId: string | null;
    setActiveVersionId: (id: string) => void;
    isPlaying: boolean;
    setIsPlaying: (val: boolean) => void;
    currentTime: number;
    setCurrentTime: (val: number) => void;
    seekTarget: { time: number; timestamp: number } | null;
    setSeekTarget: (val: { time: number; timestamp: number } | null) => void;

    // Handlers
    onAddComment: (content: string, timestamp: number, authorName?: string, parentId?: string) => Promise<void>;
    onToggleComplete: (commentId: string, isCompleted: boolean) => void;
    onToggleLock?: () => void;
    onDownload: () => void;
    onApprove: () => void;
    onUploadVersion?: (file: File) => Promise<void>;
    onUpdateProject?: (updates: Partial<Project>) => void; // For settings updates

    // UI State
    approving?: boolean;
    uploading?: boolean;
    showArchived: boolean;
    setShowArchived: (val: boolean) => void;

    // View Control
    setViewMode?: (mode: 'engineer' | 'client') => void;
    viewMode?: string;

    // Modals (Controlled by parent or local? ProjectPage has them local. Let's keep them handled by props if needed, or encapsulate here?)
    // ProjectPage manages modal visibility. Let's pass visibility props since the handlers (like onApprove) are passed in.
    showConfModal: boolean;
    setShowConfModal: (val: boolean) => void;
    showSuccessModal: boolean;
    setShowSuccessModal: (val: boolean) => void;

    // Toast (Unified)
    toast?: { message: string, type: 'success' | 'error' } | null;
    setToast?: (val: { message: string, type: 'success' | 'error' } | null) => void;

    // Version Management (Engineer Only)
    onReorderVersions?: (newOrder: any[]) => void;
    onDeleteVersion?: (versionId: string) => void;
    onRenameVersion?: (versionId: string, name: string) => void;

    // Revision Workflow
    revisionRounds?: RevisionRound[];
    activeRound?: RevisionRound | null;
    onStartRound?: () => void;

    onSubmitRound?: () => void;
    onUpdateCommentStatus?: (commentId: string, updates: { status?: 'open' | 'resolved', needsClarification?: boolean }) => void;
}

export default function ProjectView({
    project,
    comments,
    currentUser,
    role,
    activeVersionId,
    setActiveVersionId,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    seekTarget,
    setSeekTarget,
    onAddComment,
    onToggleComplete,
    onToggleLock,
    onDownload,
    onApprove,
    onUploadVersion,
    onUpdateProject,
    approving = false,
    uploading = false,
    showArchived,
    setShowArchived,
    setViewMode,
    viewMode,
    showConfModal,
    setShowConfModal,
    showSuccessModal,
    setShowSuccessModal,
    toast,
    setToast,
    onReorderVersions,
    onDeleteVersion,
    onRenameVersion,
    revisionRounds,
    activeRound,
    onStartRound,
    onSubmitRound,
    onUpdateCommentStatus
}: ProjectViewProps) {

    const [isControlsExpanded, setIsControlsExpanded] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mounted, setMounted] = useState(false);
    const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);

    const [showVersionManager, setShowVersionManager] = useState(false);

    useEffect(() => setMounted(true), []);


    // (lines 102-171 unchanged - skipping for brevity if I could, but I need to be careful with replace)
    // Actually, I can target just the return block's usages if I can match unique context.
    // Or I can replace the start of the function to add state, then replace the return block.
    // Let's do creating state first.


    // Derived
    const isClientView = role === 'client';
    console.log('ProjectView Render:', {
        role,
        isClientView,
        allowDownload: project.allowDownload,
        locked: project.isLocked
    });

    const activeVersion = project?.versions?.find(v => v.id === activeVersionId);
    const currentAudioUrl = activeVersion ? activeVersion.audioUrl : (project?.audioUrl || '');
    const versionLabel = (project.versions && project.versions.length > 0 && activeVersion) ? `Version ${activeVersion.versionNumber}` : 'Version 1';

    // Filter comments
    const versionedComments = useMemo(() => comments.filter(c => {
        if (!activeVersionId) return true;
        return c.projectVersionId === activeVersionId || !c.projectVersionId;
    }), [comments, activeVersionId]);

    const visibleComments = useMemo(() => showArchived
        ? versionedComments
        : versionedComments.filter(c => !c.isCompleted), [versionedComments, showArchived]);

    // Audio Shortcuts (Component level)
    useAudioShortcuts(isPlaying, setIsPlaying);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onUploadVersion) {
            await onUploadVersion(file);
        }
    };

    return (
        <div className={styles.container}>
            {/* Exit Client View (Engineer Only) */}
            {viewMode === 'client' && setViewMode && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                        background: '#1e3a8a', color: 'white', padding: '0.5rem',
                        textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer'
                    }}
                    onClick={() => setViewMode('engineer')}
                >
                    Viewing as Client. Click here to Exit.
                </div>
            )}

            {/* Back Link (Engineer Only) */}
            {role === 'engineer' && (
                <Link
                    href={project.clientId ? `/dashboard?client=${project.clientId}` : '/dashboard'}
                    style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                    <ArrowLeft size={16} /> {project.clientName ? `Back to ${project.clientName}` : 'Back to Clients'}
                </Link>
            )}

            <main className={styles.main} style={viewMode === 'client' ? { marginTop: '2rem' } : undefined}>
                <div className={styles.leftColumn}>
                    <header className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className={styles.headerInfo}>
                            <h1 className={styles.projectTitle}>{project.title}</h1>
                            {activeVersion && (
                                <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, marginLeft: '12px' }}>
                                    v{activeVersion.versionNumber}
                                </span>
                            )}
                        </div>

                        {/* Approval (Client Only) */}
                        {isClientView && (
                            <div>
                                {project.approvalStatus === 'APPROVED' ? (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        color: '#10b981', fontWeight: 600, fontSize: '0.95rem',
                                        backgroundColor: '#ecfdf5', padding: '0.5rem 1rem', borderRadius: 'full'
                                    }}>
                                        <Check size={18} /> Final Mix Approved
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowConfModal(true)}
                                        disabled={approving}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            backgroundColor: 'var(--primary)', color: 'white',
                                            border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px',
                                            fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                                            opacity: approving ? 0.7 : 1, transition: 'background 0.2s',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}
                                        onMouseOver={e => !approving && (e.currentTarget.style.backgroundColor = '#2563eb')}
                                        onMouseOut={e => !approving && (e.currentTarget.style.backgroundColor = 'var(--primary)')}
                                    >
                                        {approving ? 'Approving...' : <><Check size={18} /> Approve Final Mix</>}
                                    </button>
                                )}
                            </div>
                        )}
                    </header>

                    {/* Version Selector (New Tabbed UI) */}
                    {project.versions && project.versions.length > 0 && (
                        <div style={{ marginTop: '0', marginBottom: '-1px', position: 'relative', zIndex: 10, paddingLeft: '1.5rem' }}>
                            <VersionSelector
                                versions={project.versions}
                                activeVersionId={activeVersionId || activeVersion?.id || project.versions[0].id}
                                onSelect={(vid) => {
                                    // Seamless Switching Logic
                                    const timeToPreserve = currentTime;
                                    const wasPlaying = isPlaying;

                                    setActiveVersionId(vid);

                                    // Force seek to preserve time
                                    // Use slight delay to ensure render cycle? No, immediate state update is best.
                                    setSeekTarget({ time: timeToPreserve, timestamp: Date.now() });

                                    // Play state is preserved in 'isPlaying' prop, 
                                    // AudioPlayer will re-sync via its useEffect[isPlaying]
                                    if (wasPlaying) setIsPlaying(true);
                                }}
                                latestVersionId={project.versions.sort((a, b) => b.versionNumber - a.versionNumber)[0].id}
                                isEngineer={role === 'engineer'}
                                onReorder={(newIds) => {
                                    if (onReorderVersions && project.versions) {
                                        // Map IDs back to objects for the handler (it expects objects?)
                                        // Wait, projectService.reorderVersions expects IDs. 
                                        // But ProjectView props onReorderVersions says (newOrder: any[]) -> void. 
                                        // Let's check ProjectPage. It takes ProjectVersion[].
                                        // So we need to reconstruct the array of objects in new order.
                                        const reorderedVersions = newIds.map(id => (project.versions || []).find(v => v.id === id)).filter(Boolean);
                                        onReorderVersions(reorderedVersions);
                                    }
                                }}
                            />
                            {role === 'engineer' && (
                                <button
                                    onClick={() => setShowVersionManager(true)}
                                    style={{
                                        position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                                        fontSize: '0.8rem', background: 'none', border: 'none', color: '#666',
                                        cursor: 'pointer', textDecoration: 'underline'
                                    }}
                                >
                                    Manage Versions
                                </button>
                            )}

                        </div>
                    )}



                    {role === 'engineer' && activeVersion?.originalFilename && (
                        <div style={{
                            fontSize: '0.8rem', color: '#888', marginLeft: '1.5rem', marginTop: '0.5rem',
                            display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                            Source: <span style={{ fontFamily: 'monospace' }}>{activeVersion.originalFilename}</span>
                        </div>
                    )}

                    <AudioPlayer
                        versions={project.versions || []}
                        activeVersionId={activeVersionId || activeVersion?.id || project.versions?.[0]?.id || ''}
                        onTimeUpdate={setCurrentTime}
                        seekTo={seekTarget}
                        isPlaying={isPlaying}
                        onPlayPause={setIsPlaying}
                        comments={visibleComments}
                        onMarkerClick={useCallback((id: string) => {
                            // Find the comment in the *current* comments prop closure (or better, from a ref if really needed, but useMemo above handles dep changes)
                            // Actually, we need to search 'comments' which is a dependency.
                            const c = comments.find(x => x.id === id);
                            if (c) setSeekTarget({ time: c.timestamp, timestamp: Date.now() });
                        }, [comments, setSeekTarget])}
                    />



                    <p className={styles.projectMeta}>
                        {versionLabel} • Uploaded by Engineer • {new Date(project.createdAt).toLocaleDateString()}
                    </p>

                    {/* Client Download (Unlocked) */}
                    {isClientView && project.allowDownload && (
                        <div style={{ marginTop: '1.5rem', display: 'flex' }}>
                            <button
                                onClick={onDownload}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '0.6rem 1.2rem', borderRadius: '8px',
                                    border: '1px solid var(--border)', backgroundColor: 'var(--surface-alt)',
                                    color: 'var(--foreground)', fontSize: '0.9rem', fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: 'var(--shadow-sm)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                                    e.currentTarget.style.borderColor = 'var(--border-focus)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--surface-alt)';
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                }}
                            >
                                <Download size={18} style={{ opacity: 0.8 }} /> Download
                            </button>
                        </div>
                    )}

                    {/* Locked Message */}
                    {isClientView && (!project.allowDownload) && (
                        <div style={{ marginTop: '1.5rem', color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>
                            <Lock size={14} style={{ display: 'inline', marginRight: '4px' }} /> Download disabled by engineer.
                        </div>
                    )}
                </div>

                <div className={styles.rightColumn}>
                    <CommentSidebar
                        comments={versionedComments}
                        currentTime={currentTime}
                        onCommentClick={(ts) => setSeekTarget({ time: ts, timestamp: Date.now() })}
                        onAddComment={onAddComment}
                        onInputFocus={() => setIsPlaying(false)}
                        onToggleComplete={onToggleComplete}
                        isGuest={isClientView || !currentUser}
                        showArchived={showArchived}

                        onToggleArchived={() => setShowArchived(!showArchived)}
                        onUpdateStatus={onUpdateCommentStatus}
                    />

                    {/* Engineer Controls */}
                    {role === 'engineer' && (
                        <div className={styles.engineerSection}>
                            <div
                                className={styles.engineerHeader}
                                onClick={() => setIsControlsExpanded(!isControlsExpanded)}
                            >
                                <span>Engineer Controls</span>
                                {isControlsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>

                            {isControlsExpanded && (
                                <div className={styles.engineerContent}>
                                    {/* Upload */}
                                    {onUploadVersion && (
                                        <>
                                            <button
                                                className={styles.primaryActionBtn}
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                            >
                                                {uploading ? 'Uploading...' : 'Upload New Version'}
                                                <Upload size={20} />
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                style={{ display: 'none' }}
                                                accept="audio/*"
                                            />
                                        </>
                                    )}

                                    {/* Settings - ClientSharingPanel handles its own internal layout, we should pass clear props or check its styling */}
                                    {/* Since ClientSharingPanel uses .sidebarCard internally, it will pick up the new transparent styling. */}
                                    <ClientSharingPanel
                                        project={project}
                                        onUpdate={(updates) => onUpdateProject && onUpdateProject(updates)}
                                    />

                                    {/* Download Config */}
                                    <div className={styles.sidebarCard}>
                                        <div className={styles.controlRow}>
                                            <div className={styles.sidebarCardTitle}>Downloads</div>
                                            <label className={styles.toggleSwitch} style={{ transform: 'scale(0.9)', transformOrigin: 'right center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={project.allowDownload || false}
                                                    onChange={(e) => onUpdateProject && onUpdateProject({ allowDownload: e.target.checked })}
                                                />
                                                <span className={styles.slider}></span>
                                            </label>
                                        </div>
                                        {/* Download button as a subtle secondary action below or logically grouped */}
                                        {((role === 'engineer') || (project.allowDownload)) && (
                                            <div style={{ paddingLeft: '0', marginTop: '0.25rem' }}>
                                                <button onClick={onDownload} style={{
                                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                    fontSize: '0.8rem', padding: '6px', background: 'var(--surface)', border: '1px solid var(--border)',
                                                    borderRadius: '4px', cursor: 'pointer', color: 'var(--foreground)'
                                                }}>
                                                    <Download size={14} /> Download File
                                                </button>
                                            </div>
                                        )}
                                    </div>




                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main >

            {/* Toast */}
            {
                toast && setToast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )
            }

            {/* Confirmation Modal */}
            {
                showConfModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} onClick={() => setShowConfModal(false)}>
                        <div style={{
                            backgroundColor: 'white', padding: '2rem', borderRadius: '12px',
                            maxWidth: '450px', width: '90%', textAlign: 'center', transform: 'translateY(-20px)',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                        }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#111' }}>Approve Final Mix?</h2>
                            <p style={{ color: '#666', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                This will mark this version as the final approved mix and notify your engineer.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setShowConfModal(false)}
                                    style={{
                                        padding: '0.6rem 1.2rem', border: '1px solid #ddd', borderRadius: '8px',
                                        background: 'white', fontWeight: 600, cursor: 'pointer', color: '#555'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onApprove}
                                    disabled={approving}
                                    style={{
                                        padding: '0.6rem 1.2rem', border: 'none', borderRadius: '8px',
                                        background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer',
                                        opacity: approving ? 0.7 : 1
                                    }}
                                >
                                    {approving ? 'Approving...' : 'Approve'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Success Modal */}
            {
                showSuccessModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{
                            backgroundColor: 'white', padding: '2rem', borderRadius: '12px',
                            maxWidth: '450px', width: '90%', textAlign: 'center',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#111' }}>Congratulations!</h2>
                            <p style={{ color: '#666', marginBottom: '2rem', lineHeight: 1.5 }}>
                                We've notified your engineer that you approved the final mix!
                            </p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                style={{
                                    padding: '0.75rem 2rem', border: 'none', borderRadius: '8px',
                                    background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer',
                                    width: '100%'
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Version Manager Modal */}
            {
                showVersionManager && mounted && createPortal(
                    <VersionManager
                        versions={project.versions || []}
                        onReorder={(newOrder) => onReorderVersions?.(newOrder)}
                        onDelete={(id) => onDeleteVersion?.(id)}
                        onRename={(id, name) => onRenameVersion?.(id, name)}
                        onClose={() => setShowVersionManager(false)}
                    />,
                    document.body
                )
            }
        </div >
    );
}
