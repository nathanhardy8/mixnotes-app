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
import { Comment, Project, User } from '@/types';
import { useAudioShortcuts } from '@/hooks/useAudioShortcuts';

import ClientSharingPanel from '@/components/ReviewSettingsPanel';

// ... (imports)
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

    // --- FETCH DATA ---
    useEffect(() => {
        if (!id) return;

        if (shareToken) {
            // Guest Access via Token
            setLoadingProject(true);
            projectService.getProjectByShareToken(shareToken).then(p => {
                if (p) {
                    setProject(p);
                    // Explicitly set Guest User if not logged in
                    if (!currentUser) {
                        const guestUser: User = {
                            id: 'guest-' + shareToken,
                            email: '',
                            name: 'Guest Client',
                            role: 'client',
                            defaultRevisionLimit: null
                        };
                        setGuestUser(guestUser);
                    }
                }
                setLoadingProject(false);
            });
            return;
        }

        // Regular Auth Access
        const p = getProject(id);
        // Only use cached project if it has versions loaded, otherwise fetch full details
        if (p && p.versions && p.versions.length > 0) {
            setProject(p);
            setLoadingProject(false);
        } else {
            setLoadingProject(true);
            projectService.getProjectById(id).then(fullP => {
                setProject(fullP);
                setLoadingProject(false);
            });
        }

        // Load Comments
        loadComments();
    }, [id, getProject]); // Removed shareToken from dependency to avoid loop if it changes

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
        const data = await projectService.getComments(id);
        setComments(data || []);
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

    const handleAddComment = async (content: string, timestamp: number, guestName?: string) => {
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
            projectVersionId: selectedVersionId
        };

        // OPTIMISTIC UPDATE
        const tempId = `temp-${Date.now()}`;
        setComments(prev => [...prev, { ...newComment, id: tempId, createdAt: new Date().toISOString() }]);

        try {
            const added = await projectService.addComment(newComment);
            if (added) {
                // Replace temp with real
                setComments(prev => prev.map(c => c.id === tempId ? added : c));
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
        const success = await projectService.toggleCommentComplete(commentId, isCompleted);
        if (success) {
            setComments(prev => prev.map(c =>
                c.id === commentId ? { ...c, isCompleted } : c
            ));
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
                const ver = await projectService.createVersion(project.id, url, project.engineerId);
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
        />
    );
}
