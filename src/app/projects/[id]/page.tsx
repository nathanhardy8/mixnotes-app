'use client';

import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Unlock, Download, ArrowLeft, ChevronDown, ChevronUp, Share2, Copy, RefreshCw, Check, Upload } from 'lucide-react';
import AudioPlayer from '@/components/AudioPlayer';
import CommentSidebar from '@/components/CommentSidebar';

import styles from './styles.module.css';
import { useUser } from '@/context/UserContext';
import { useProjects } from '@/context/ProjectContext';
import { projectService } from '@/services/projectService';
import { Comment, Project, User, ProjectVersion, RevisionRound } from '@/types';
import { useAudioShortcuts } from '@/hooks/useAudioShortcuts';

import ClientSharingPanel from '@/components/ReviewSettingsPanel';

// ... (imports)
import { createClient } from '@/utils/supabase/client';
import ProjectView from '@/components/ProjectView';

export default function ProjectPage() {
    const params = useParams();
    const id = params?.id as string;
    const searchParams = useSearchParams();
    const shareToken = searchParams?.get('share_token');

    const { getProject } = useProjects();
    const { currentRole, currentUser, setGuestUser } = useUser();

    // --- REAL DATA STATE ---
    const [project, setProject] = useState<Project | null>(null);
    const [loadingProject, setLoadingProject] = useState(true);
    const [comments, setComments] = useState<Comment[]>([]);

    // UI State
    const [uploading, setUploading] = useState(false);

    // Approval State
    const [approving, setApproving] = useState(false);
    const [showConfModal, setShowConfModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Version State
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [revisionRounds, setRevisionRounds] = useState<RevisionRound[]>([]);
    const [activeRound, setActiveRound] = useState<RevisionRound | null>(null);

    // Tracks IDs of comments we just added but haven't seen from server poll yet
    const freshlyAddedIds = useRef<Set<string>>(new Set());

    const supabase = createClient();

    const loadProject = async () => {
        if (!id) return;

        if (shareToken) {
            // Guest Access via Token
            setLoadingProject(true);
            const p = await projectService.getProjectByShareToken(shareToken);
            if (p) {
                setProject(p);
                if (!currentUser) {
                    setGuestUser({
                        id: 'guest-' + shareToken,
                        email: '',
                        name: 'Guest Client',
                        role: 'client',
                        defaultRevisionLimit: null
                    });
                }
            }
            setLoadingProject(false);
            return;
        }

        // Regular Auth Access
        if (!project) setLoadingProject(true);
        const fullP = await projectService.getProjectById(id);
        setProject(fullP);
        setLoadingProject(false);
    };

    // --- FETCH DATA ---
    useEffect(() => {
        loadProject();
    }, [id, shareToken, currentUser?.id]);

    // Realtime subscription for project and versions
    useEffect(() => {
        if (!id) return;

        const channel = supabase.channel(`project-${id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${id}` },
                () => { loadProject(); }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'project_versions', filter: `project_id=eq.${id}` },
                () => { loadProject(); }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'revision_rounds', filter: `project_id=eq.${id}` },
                () => { loadRounds(); }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'comments', filter: `project_id=eq.${id}` },
                () => { loadComments(); }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    // Reload comments when Version Changes
    useEffect(() => {
        loadComments();
        loadRounds();
    }, [selectedVersionId]);

    // Initialize/Sync Selected Version
    useEffect(() => {
        if (project && project.versions && project.versions.length > 0) {
            // Only set if not already set or invalid
            if (!selectedVersionId || !project.versions.find(v => v.id === selectedVersionId)) {
                setSelectedVersionId(project.versions[0].id);
            }
        }
    }, [project, selectedVersionId]);

    const loadComments = async () => {
        if (!id) return;
        const data = await projectService.getComments(id, selectedVersionId || undefined);

        setComments(prev => {
            const serverComments = data || [];

            // 1. Preserve optimistic (temp) comments
            const optimisticComments = prev.filter(c => String(c.id).startsWith('temp-'));

            // 2. Preserve locally added comments that server might have missed in a race
            // (Only if they are not already in serverComments)
            const locallyAddedButMissing = prev.filter(c =>
                freshlyAddedIds.current.has(c.id) &&
                !serverComments.some(sc => sc.id === c.id)
            );

            // Cleanup freshlyAddedIds for those that ARE in serverComments now
            serverComments.forEach(sc => {
                if (freshlyAddedIds.current.has(sc.id)) {
                    freshlyAddedIds.current.delete(sc.id);
                }
            });

            return [...serverComments, ...locallyAddedButMissing, ...optimisticComments];
        });
    };

    const loadRounds = async () => {
        if (!selectedVersionId) {
            setRevisionRounds([]);
            setActiveRound(null);
            return;
        }
        const rounds = await projectService.getRevisionRounds(selectedVersionId);
        setRevisionRounds(rounds);
        if (rounds.length > 0) {
            setActiveRound(rounds[0]);
        } else {
            setActiveRound(null);
        }
    };



    // --- SYNC LOGIC ---
    useEffect(() => {
        if (!id) return;

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible' && !shareToken) {
                loadComments();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [id]);

    const [showArchived, setShowArchived] = useState(false);

    // --- PLAYER STATE ---
    const [currentTime, setCurrentTime] = useState(0);
    const [seekTarget, setSeekTarget] = useState<{ time: number; timestamp: number } | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // --- VIEW STATE ---
    const { viewMode, setViewMode } = useUser();
    const effectiveRole = viewMode || 'engineer';

    // --- HANDLERS ---

    const handleAddComment = async (content: string, timestamp: number, guestName?: string, parentId?: string) => {
        const authorId = currentUser?.id || `guest-${Date.now()}`;

        let authorType: 'ENGINEER' | 'CLIENT' = 'CLIENT';
        let authorName = guestName || 'Client';

        if (currentUser) {
            authorType = 'ENGINEER';
            authorName = currentUser.name || 'Engineer';
        }

        const newComment: any = {
            projectId: id,
            authorId,
            content,
            timestamp,
            authorType,
            authorName,
            authorUserId: currentUser?.id,

            projectVersionId: selectedVersionId,
            revisionRoundId: activeRound?.status === 'draft' ? activeRound.id : undefined,
            status: 'open',
            needsClarification: false,
            parentId // Add parentId
        };

        // OPTIMISTIC UPDATE
        const tempId = `temp-${Date.now()}`;
        setComments(prev => [...prev, { ...newComment, id: tempId, createdAt: new Date().toISOString() }]);

        try {
            const added = await projectService.addComment(newComment);
            if (added) {
                // Track this ID as locally added to prevent flicker on subsequent polls
                freshlyAddedIds.current.add(added.id);

                // Replace temp with real
                setComments(prev => {
                    const exists = prev.some(c => c.id === added.id);
                    if (exists) {
                        return prev.filter(c => c.id !== tempId);
                    }
                    return prev.map(c => c.id === tempId ? added : c);
                });
            } else {
                // Remove temp if failed
                setComments(prev => prev.filter(c => c.id !== tempId));
            }
        } catch (error) {
            setComments(prev => prev.filter(c => c.id !== tempId));
            console.error("Failed to add comment", error);
        }
    };

    const handleToggleComplete = async (commentId: string, isCompleted: boolean) => {
        // Legacy support: sync isCompleted with status='resolved'
        const status = isCompleted ? 'resolved' : 'open';

        // Optimistic
        setComments(prev => prev.map(c =>
            c.id === commentId ? { ...c, isCompleted, status } : c
        ));

        // Call both for compatibility? 
        // projectService.toggleCommentComplete updates is_completed.
        // projectService.updateCommentStatus updates status.
        // Let's do both or update service to do both.
        // For now, let's call updateCommentStatus which is cleaner for new workflow, 
        // AND toggleComplete for legacy.

        await projectService.toggleCommentComplete(commentId, isCompleted);
        await projectService.updateCommentStatus(commentId, status);
    };

    const handleUpdateCommentStatus = async (commentId: string, updates: { status?: 'open' | 'resolved', needsClarification?: boolean }) => {
        setComments(prev => prev.map(c =>
            c.id === commentId ? { ...c, ...updates, isCompleted: updates.status === 'resolved' ? true : (updates.status === 'open' ? false : c.isCompleted) } : c
        ));

        await projectService.updateCommentStatus(commentId, updates.status, updates.needsClarification);

        // Sync legacy is_completed if status changed
        if (updates.status) {
            await projectService.toggleCommentComplete(commentId, updates.status === 'resolved');
        }
    };

    const handleToggleLock = async () => {
        if (!project || effectiveRole !== 'engineer') return;

        const newLocked = !project.isLocked;
        const success = await projectService.updateProject(id, { isLocked: newLocked });
        if (success) {
            setProject(prev => prev ? { ...prev, isLocked: newLocked } : null);
        }
    };

    const handleDownload = () => {
        if (!project) return;
        // Allow if allowed by engineer OR if user is engineer
        if (!project.allowDownload && effectiveRole !== 'engineer') return;

        // Find audio URL for active version
        const activeVer = project.versions?.find(v => v.id === selectedVersionId);
        const url = activeVer ? activeVer.audioUrl : project.audioUrl;

        window.open(url, '_blank');
    };

    const handleUploadVersion = async (file: File) => {
        if (!project) return;
        setUploading(true);
        try {
            const url = await projectService.uploadFile(file);
            if (url) {
                const ver = await projectService.createVersion(project.id, url, project.engineerId, file.name);
                if (ver) {
                    alert('New version uploaded!');
                    window.location.reload();
                }
            }
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProject = async (updates: Partial<Project>) => {
        if (!project) return;
        const success = await projectService.updateProject(project.id, updates);
        if (success) {
            setProject(prev => prev ? ({ ...prev, ...updates }) : null);
        }
    };

    const handleApprove = async () => {
        if (!project) return;

        const versionId = selectedVersionId || (project.versions && project.versions.length > 0 ? project.versions[0].id : null);

        if (!versionId) {
            alert('No version to approve.');
            return;
        }

        setApproving(true);
        // If guest, use shareToken from params
        const res = await projectService.approveProjectVersion(project.id, versionId, shareToken || undefined);

        setApproving(false);

        if (res.success) {
            setShowConfModal(false);
            setShowSuccessModal(true);
            setProject(prev => prev ? ({
                ...prev,
                approvalStatus: 'APPROVED',
                approvedVersionId: versionId
            }) : null);
        } else {
            alert(res.error || 'Failed to approve');
        }
    };

    // --- VERSION MANAGEMENT HANDLERS ---
    const handleVersionReorder = async (newOrder: ProjectVersion[]) => {
        if (!project) return;

        // Optimistic update
        // CRITICAL: Must update displayOrder property on objects too, 
        // otherwise downstream components that sort by displayOrder will revert to old order.
        const optimisticVersions = newOrder.map((v, index) => ({
            ...v,
            displayOrder: index
        }));

        setProject(prev => prev ? { ...prev, versions: optimisticVersions } : null);

        const ids = newOrder.map(v => v.id);
        const success = await projectService.reorderVersions(project.id, ids);
        if (!success) {
            console.error("Failed to reorder versions");
            alert("Failed to save new order. Please check console or permissions.");
            // Ideally revert state here by fetching project again
        }
    };

    const handleVersionDelete = async (versionId: string) => {
        if (!project) return;

        const success = await projectService.deleteVersion(versionId);
        if (success) {
            setProject(prev => {
                if (!prev || !prev.versions) return prev;
                const newVersions = prev.versions.filter(v => v.id !== versionId);

                // If deleted active version, switch to another
                if (selectedVersionId === versionId) {
                    const fallback = newVersions.length > 0 ? newVersions[0].id : null;
                    setSelectedVersionId(fallback);
                }

                return { ...prev, versions: newVersions };
            });
        } else {
            alert("Failed to delete version");
        }
    };

    const handleVersionRename = async (versionId: string, name: string) => {
        if (!project) return;

        // Optimistic
        setProject(prev => {
            if (!prev || !prev.versions) return prev;
            return {
                ...prev,
                versions: prev.versions.map(v => v.id === versionId ? { ...v, displayName: name } : v)
            };
        });

        const success = await projectService.renameVersion(project.id, versionId, name);
        if (!success) {
            console.error("Failed to rename version");
            // Revert or show error
        }

    };

    const handleStartRound = async () => {
        if (!project || !selectedVersionId) return;

        // Ensure no pending round?
        if (activeRound && activeRound.status === 'draft') return;

        const newRound = await projectService.createRevisionRound({
            projectId: project.id,
            projectVersionId: selectedVersionId,
            authorType: currentUser?.role === 'engineer' ? 'ENGINEER' : 'CLIENT', // Assuming engineer can start too? Usually Client starts.
            authorId: currentUser?.id, // or guest
            status: 'draft',
            title: `Revision ${revisionRounds.length + 1}`
        });

        if (newRound) {
            await loadRounds();
            // Also update version status to 'in_review' if it wasn't?
            // Actually starting a round implies we are working on it.
            // If it was 'in_review', it stays 'in_review'.
        }
    };

    const handleSubmitRound = async () => {
        if (!activeRound) return;

        const success = await projectService.updateRevisionRoundStatus(activeRound.id, 'submitted');
        if (success) {
            // Also update version status to 'changes_requested'
            if (project?.versions) {
                const ver = project.versions.find(v => v.id === selectedVersionId);
                if (ver) {
                    await projectService.updateVersionReviewStatus(ver.id, 'changes_requested');
                    // Update local project state for immediate feedback
                    setProject(prev => {
                        if (!prev || !prev.versions) return prev;
                        return {
                            ...prev,
                            versions: prev.versions.map(v => v.id === selectedVersionId ? { ...v, reviewStatus: 'changes_requested' } : v)
                        };
                    });
                }
            }
            await loadRounds();
            alert("Feedback submitted to engineer!");
        }
    };

    if (loadingProject) {
        return <div className={styles.container}>Loading project...</div>;
    }

    if (!project) {
        return <div className={styles.container}>Project not found</div>;
    }

    return (
        <ProjectView
            project={project}
            comments={comments}
            currentUser={currentUser}
            role={effectiveRole === 'client' ? 'client' : 'engineer'}

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
            onToggleLock={handleToggleLock}
            onDownload={handleDownload}
            onApprove={handleApprove}
            onUploadVersion={handleUploadVersion}
            onUpdateProject={handleUpdateProject}
            onReorderVersions={handleVersionReorder}
            onDeleteVersion={handleVersionDelete}
            onRenameVersion={handleVersionRename}

            approving={approving}
            uploading={uploading}
            showArchived={showArchived}
            setShowArchived={setShowArchived}

            viewMode={viewMode}
            setViewMode={setViewMode}

            showConfModal={showConfModal}
            setShowConfModal={setShowConfModal}
            showSuccessModal={showSuccessModal}
            setShowSuccessModal={setShowSuccessModal}


            // Revision Workflow Props
            revisionRounds={revisionRounds}
            activeRound={activeRound}
            onStartRound={handleStartRound}

            onSubmitRound={handleSubmitRound}
            onUpdateCommentStatus={handleUpdateCommentStatus}
        />
    );
}
