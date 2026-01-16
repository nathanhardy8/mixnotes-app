'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { projectService } from '@/services/projectService';
import { Comment, Project, User } from '@/types';
import ProjectView from '@/components/ProjectView';

export default function ReviewPage() {
    // ... params ...
    const params = useParams();
    const searchParams = useSearchParams();
    const publicId = params?.public_id as string;
    const token = searchParams?.get('t');

    const [project, setProject] = useState<Project | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal & Action State
    const [approving, setApproving] = useState(false);
    const [showConfModal, setShowConfModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // ... Player State & Effects (unchanged) ...
    const [currentTime, setCurrentTime] = useState(0);
    const [seekTarget, setSeekTarget] = useState<{ time: number; timestamp: number } | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    // Active Version
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);


    // User State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentUser, setCurrentUser] = useState<any>(null);

    // ... useEffect ...
    useEffect(() => {
        // Check for authenticated user
        const checkUser = async () => {
            const { createClient } = await import('@/utils/supabase/client');
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUser(user);
        };
        checkUser();

        if (publicId && token) {
            validateSession();
        } else {
            setError('Invalid link');
            setLoading(false);
        }
    }, [publicId, token]);

    // Initialize/Sync Selected Version
    useEffect(() => {
        if (project && project.versions && project.versions.length > 0) {
            // Only set if not already set or invalid
            if (!selectedVersionId || !project.versions.find(v => v.id === selectedVersionId)) {
                setSelectedVersionId(project.versions[0].id); // Defaults to first in list (latest)
            }
        } else if (project?.activeVersionId && !selectedVersionId) {
            // Fallback if versions array not fully populated
            setSelectedVersionId(project.activeVersionId);
        }
    }, [project, selectedVersionId]);

    // ... validateSession ...
    const validateSession = async () => {
        try {
            const res = await fetch('/api/review/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId, token })
            });
            const data = await res.json();

            if (data.success) {
                // Ensure project has versions array (validate endpoint should return it)
                // If the validate endpoint returns a simple structure, we might need to map it.
                // Assuming data.project matches Project type reasonably well.
                setProject(data.project);
                loadComments(data.project.id, data.project.activeVersionId);
            } else {
                setError(data.error || 'Access denied');
            }
        } catch (err) {
            setError('Failed to load project');
        } finally {
            setLoading(false);
        }
    };

    // ... loadComments ...
    const loadComments = async (projectId: string, versionId?: string) => {
        // Use secure API for guests
        try {
            const res = await fetch('/api/review/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId, token, versionId })
            });
            const data = await res.json();
            if (data.success) {
                setComments(data.comments);
            }
        } catch (e) {
            console.error('Failed to load comments via API', e);
        }
    };

    // Silent Refresh for Realtime
    const refreshProject = async () => {
        try {
            const res = await fetch('/api/review/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId, token })
            });
            const data = await res.json();
            if (data.success) {
                // Preserve local state if needed, or just replace
                setProject(prev => {
                    // Only update if changed to avoid renders? React handles object identity checks, but deep comparison is checking.
                    // For now, simple replacement.
                    // We might need to ensure activeVersion is preserved if valid?
                    // The `useEffect` below handles `selectedVersionId` logic.
                    return data.project;
                });
            }
        } catch (e) {
            console.error("Failed to refresh project", e);
        }
    };

    // Realtime Subscription
    useEffect(() => {
        if (!project?.id) return;

        const setupRealtime = async () => {
            const { createClient } = await import('@/utils/supabase/client');
            const supabase = createClient();

            const channel = supabase.channel(`review-${project.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${project.id}` },
                    (payload) => {
                        console.log('Project updated:', payload);
                        refreshProject();
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'project_versions', filter: `project_id=eq.${project.id}` },
                    (payload) => {
                        console.log('Version updated:', payload);
                        refreshProject();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        const cleanupPromise = setupRealtime();

        // Cleanup function for useEffect
        return () => {
            cleanupPromise.then(cleanup => cleanup && cleanup());
        };
    }, [project?.id]);

    // Polling for comments
    useEffect(() => {
        if (!project?.id) return;
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadComments(project.id, project.activeVersionId);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [project?.id, project?.activeVersionId]);

    const handleAddComment = async (content: string, timestamp: number, authorName?: string) => {
        if (!project || !token) return;

        // OPTIMISTIC UPDATE
        const tempId = `temp-${Date.now()}`;
        const tempComment: Comment = {
            id: tempId,
            projectId: project.id,
            authorId: 'client-guest', // Placeholder
            content,
            timestamp,
            createdAt: new Date().toISOString(),
            authorType: 'CLIENT', // Guest is always client
            authorName: authorName || 'Client',
            projectVersionId: selectedVersionId || project.activeVersionId
        };

        setComments(prev => [...prev, tempComment]);

        try {
            const res = await fetch('/api/review/comment', {
                method: 'POST',
                body: JSON.stringify({
                    publicId,
                    token,
                    content, // Send raw content
                    authorName, // Send author name explicitly (if guest)
                    timestamp,
                    versionId: selectedVersionId || project.activeVersionId
                })
            });
            const data = await res.json();

            if (data.success) {
                // If success, we can replace the temp comment with the real one, or just reload.
                // Reloading ensures we have the server-generated ID and author info correct.
                // But to prevent flicker, we could try to just patch the temp comment if we had the ID.
                // For now, let's reload but the optimistic one is already there so it feels instant.
                // WE MUST REMOVE the temp one before loading or let loadComments replace it.
                // Since loadComments sets state, it will replace our optimistic one.
                await loadComments(project.id, selectedVersionId || project.activeVersionId);
                setToast({ message: 'Comment added', type: 'success' });
            } else {
                // Revert optimistic
                setComments(prev => prev.filter(c => c.id !== tempId));
                const msg = data.error || 'Failed to post comment';
                setToast({ message: msg, type: 'error' });
                throw new Error(msg);
            }
        } catch (e) {
            // Revert optimistic
            setComments(prev => prev.filter(c => c.id !== tempId));
            setToast({ message: 'Network error', type: 'error' });
            throw e;
        }
    };

    const handleToggleComplete = async (commentId: string, isCompleted: boolean) => {
        // NOTE: Standard projectService might require Auth? 
        // guests cant toggle complete typically unless we expose an API endpoint for it in /api/review.
        // For MVP, we might disable this for guests or add a route.
        // Let's assume for now guests normally READ status, engineer sets it.
        // If Client *can* toggle, we need an API route akin to /api/review/comment but for toggling.
        // I'll skip implementation for guest for this step or call projectService with caution.
        // projectService uses supabase.from(...).update(...) which is RLS protected.
        // Guests via token CANNOT call this.
        // So for now, we do nothing or show error.

        if (currentUser) {
            const success = await projectService.toggleCommentComplete(commentId, isCompleted);
            if (success) {
                setComments(prev => prev.map(c =>
                    c.id === commentId ? { ...c, isCompleted } : c
                ));
            }
        } else {
            console.warn('Guest cannot toggle comments yet (API missing)');
            // Optionally: setToast({ message: 'Only engineers can resolve comments', type: 'error' });
        }
    };

    // Download: Client can download if allowed
    const handleDownload = () => {
        if (!project) return;
        if (!project.allowDownload) return;

        const activeVer = project.versions?.find(v => v.id === selectedVersionId);
        const url = activeVer ? activeVer.audioUrl : project.audioUrl;

        window.open(url, '_blank');
    };

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this version as final? This will lock the project from further changes.')) return;

        setApproving(true);
        try {
            const res = await fetch('/api/review/approve', {
                method: 'POST',
                body: JSON.stringify({
                    publicId,
                    token,
                    versionId: selectedVersionId || project?.activeVersionId,
                    action: 'APPROVE'
                })
            });

            const data = await res.json();
            if (data.success) {
                setProject(prev => prev ? { ...prev, approvalStatus: 'APPROVED' } : null);
                setShowSuccessModal(true);
                setShowConfModal(false); // Close conf if open
            } else {
                alert(data.error || 'Failed to approve');
            }
        } catch (e) {
            alert('Network error during approval');
        } finally {
            setApproving(false);
        }
    };

    if (loading) return <div className={styles.container} style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading review...</p></div>;
    if (error) return <div className={styles.container} style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#64748b' }}>{error}</p></div>;
    if (!project) return null;

    return (
        <ProjectView
            project={{
                ...project,
                // Ensure versions array if missing
                versions: project.versions || (project.activeVersionId ? [{
                    id: project.activeVersionId,
                    projectId: project.id,
                    versionNumber: 1, // Fallback
                    audioUrl: project.audioUrl,
                    createdAt: project.createdAt,
                    isApproved: project.approvalStatus === 'APPROVED'
                }] : [])
            }}
            comments={comments}
            currentUser={currentUser}
            role={'client'}

            activeVersionId={selectedVersionId}
            setActiveVersionId={setSelectedVersionId}

            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            seekTarget={seekTarget}
            setSeekTarget={setSeekTarget}

            onAddComment={handleAddComment}
            onToggleComplete={handleToggleComplete}
            onDownload={handleDownload}
            onApprove={handleApprove}

            approving={approving}
            showArchived={showArchived}
            setShowArchived={setShowArchived}

            showConfModal={showConfModal}
            setShowConfModal={setShowConfModal}
            showSuccessModal={showSuccessModal}
            setShowSuccessModal={setShowSuccessModal}

            toast={toast}
            setToast={setToast}
        />
    );
}

// Minimal styles wrapper to keep imports happy if needed, but ProjectView handles layout.
// We can remove styles usage if ProjectView doesn't need external container class
import styles from './styles.module.css';
