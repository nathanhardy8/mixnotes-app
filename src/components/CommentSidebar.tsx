'use client';

import { useState, useMemo } from 'react';
import { Send, Edit2, Trash2, Reply, X, Save } from 'lucide-react';
import { Comment } from '@/types';
import styles from './CommentSidebar.module.css';

interface CommentSidebarProps {
    comments: Comment[];
    currentTime: number;
    onCommentClick: (timestamp: number) => void;
    onAddComment: (content: string, timestamp: number, authorName?: string, parentId?: string) => void;
    onInputFocus?: () => void;
    onToggleComplete: (commentId: string, isCompleted: boolean) => void;
    isGuest?: boolean;
    showArchived: boolean;
    onToggleArchived: () => void;

    // Hover Linking
    hoveredCommentId?: string | null;
    onHoverComment?: (id: string | null) => void;

    // Actions
    onEditComment?: (commentId: string, content: string) => void;
    onDeleteComment?: (commentId: string) => void;

    // Permissions
    currentUserRole?: 'engineer' | 'client' | string;
    currentUserId?: string;
}

interface CommentNode extends Comment {
    children: CommentNode[];
}

export default function CommentSidebar({
    comments,
    currentTime,
    onCommentClick,
    onAddComment,
    onInputFocus,
    onToggleComplete,
    isGuest = false,
    showArchived,
    onToggleArchived,
    hoveredCommentId,
    onHoverComment,
    onEditComment,
    onDeleteComment,
    currentUserRole,
    currentUserId
}: CommentSidebarProps) {

    // Filtering
    const visibleComments = useMemo(() => {
        return showArchived ? comments : comments.filter(c => !c.isCompleted);
    }, [comments, showArchived]);

    // Build Tree
    const commentTree = useMemo(() => {
        const map = new Map<string, CommentNode>();
        const roots: CommentNode[] = [];

        // Initialize map
        // Sort by timestamp first so threads are generally chronological
        const sorted = [...visibleComments].sort((a, b) => a.timestamp - b.timestamp);

        sorted.forEach(c => {
            map.set(c.id, { ...c, children: [] });
        });

        sorted.forEach(original => {
            const node = map.get(original.id)!;
            if (original.parentId && map.has(original.parentId)) {
                map.get(original.parentId)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }, [visibleComments]);


    // Main Input State
    const [newComment, setNewComment] = useState('');
    const [guestName, setGuestName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load guest name
    useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('guest_name');
            if (saved) setGuestName(saved);
        }
    });

    const handleMainSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        if (isGuest && guestName.trim()) {
            localStorage.setItem('guest_name', guestName.trim());
        }

        setIsSubmitting(true);
        try {
            await onAddComment(newComment, currentTime, isGuest ? (guestName.trim() || 'Client') : undefined);
            setNewComment('');
        } catch (error) {
            console.error('Failed to post comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (t: number) => {
        const mins = Math.floor(t / 60);
        const secs = Math.floor(t % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h3 className={styles.title}>Comments ({visibleComments.length})</h3>
                <button onClick={onToggleArchived} className={styles.archiveToggle}>
                    {showArchived ? 'Hide' : 'Show'} Archived
                </button>
            </header>

            <div className={styles.inputArea}>
                {isGuest && (
                    <input
                        type="text"
                        placeholder="Your Name (Optional)"
                        className={styles.guestInput}
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        disabled={isSubmitting}
                    />
                )}
                <form onSubmit={handleMainSubmit} className={styles.inputForm}>
                    <input
                        type="text"
                        placeholder={`Comment at ${formatTime(currentTime)}...`}
                        className={styles.input}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onFocus={onInputFocus}
                        disabled={isSubmitting}
                    />
                    <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !newComment.trim()} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                        {isSubmitting ? '...' : <Send size={16} />}
                    </button>
                </form>
            </div>

            <div className={styles.commentList}>
                {commentTree.map(node => (
                    <CommentItem
                        key={node.id}
                        node={node}
                        currentTime={currentTime}
                        onCommentClick={onCommentClick}
                        onToggleComplete={onToggleComplete}
                        hoveredCommentId={hoveredCommentId}
                        onHoverComment={onHoverComment}
                        onEditComment={onEditComment}
                        onDeleteComment={onDeleteComment}
                        onReplyComment={onAddComment}
                        currentUserRole={currentUserRole}
                        currentUserId={currentUserId}
                        guestName={guestName}
                        isGuest={isGuest}
                        formatTime={formatTime}
                    />
                ))}
            </div>
        </div>
    );
}


// --- Recursive Comment Item Component ---

interface CommentItemProps {
    node: CommentNode;
    currentTime: number;
    onCommentClick: (timestamp: number) => void;
    onToggleComplete: (id: string, val: boolean) => void;
    hoveredCommentId?: string | null;
    onHoverComment?: (id: string | null) => void;
    onEditComment?: (id: string, content: string) => void;
    onDeleteComment?: (id: string) => void;
    onReplyComment: (content: string, timestamp: number, authorName?: string, parentId?: string) => void;
    currentUserRole?: string;
    currentUserId?: string;
    guestName: string;
    isGuest: boolean;
    formatTime: (t: number) => string;
}

function CommentItem({
    node,
    currentTime,
    onCommentClick,
    onToggleComplete,
    hoveredCommentId,
    onHoverComment,
    onEditComment,
    onDeleteComment,
    onReplyComment,
    currentUserRole,
    currentUserId,
    guestName,
    isGuest,
    formatTime
}: CommentItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(node.content);
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Permissions Logic
    const canEdit = currentUserRole === 'engineer' || (node.authorUserId === currentUserId && currentUserId) || (isGuest && node.authorType === 'CLIENT' && !node.authorUserId);
    // Guest logic is tricky without IDs. Assuming guests can edit anonymous client comments if they are guests. 
    // Actually, safer: Engineer can edit all. Users can edit OWN (by ID).
    // Guests without ID cannot reliably "own" a comment after refresh unless we store session ID. 
    // For now, let's allow "Engineer" + "Matching UserID".

    // Strict Permission:
    const hasEditPermission =
        currentUserRole === 'engineer' ||
        (currentUserId && node.authorUserId === currentUserId);

    const handleSaveEdit = async () => {
        if (!editContent.trim() || !onEditComment) return;
        setIsSubmitting(true);
        await onEditComment(node.id, editContent);
        setIsSubmitting(false);
        setIsEditing(false);
    };

    const handleSubmitReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) return;
        setIsSubmitting(true);
        // Reply timestamp: Use Parent's timestamp? Or Current Time?
        // Req: "New reply: adds marker at its timestamp".
        // Usually replies inherit parent timestamp or use current playback time?
        // Let's use current playback time for the reply marker, but structurally it's a child.
        // Wait, if I reply to a comment at 1:00 while playing at 2:00, is the reply about 1:00 or 2:00?
        // Usually threaded replies are "discussion about the note", so they share context. 
        // But if it gets a marker, it has a separate time.
        // Let's use `currentTime` (playback) for the new marker.

        await onReplyComment(replyContent, currentTime, isGuest ? (guestName.trim() || 'Client') : undefined, node.id);

        setReplyContent('');
        setIsSubmitting(false);
        setIsReplying(false);
    };

    // Helper to get display name
    const authorDisplayName = node.authorName ? (
        <>
            {node.authorName}
            {node.authorType === 'ENGINEER' && <span style={{ opacity: 0.5, fontSize: '0.8em', marginLeft: '4px' }}> (Engineer)</span>}
        </>
    ) : (
        node.authorType === 'ENGINEER' ? 'Engineer' : 'Client' // Simplified fallback
    );


    return (
        <div className={styles.commentThread}>
            <div
                id={`comment-${node.id}`}
                className={`${styles.commentItem} ${node.isCompleted ? styles.completed : ''} ${hoveredCommentId === node.id ? styles.hovered : ''}`}
                onClick={() => onCommentClick(node.timestamp)}
                onMouseEnter={() => onHoverComment?.(node.id)}
                onMouseLeave={() => onHoverComment?.(null)}
            >
                <div className={styles.commentHeader}>
                    <span className={styles.author}>{authorDisplayName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.timeTag}>@ {formatTime(node.timestamp)}</span>

                        {/* Actions (Only show if not editing) */}
                        {!isEditing && (
                            <div className={styles.actions}>
                                <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); setIsReplying(!isReplying); }} title="Reply">
                                    <Reply size={14} />
                                </button>
                                {hasEditPermission && (
                                    <>
                                        <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditContent(node.content); }} title="Edit">
                                            <Edit2 size={14} />
                                        </button>
                                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={(e) => { e.stopPropagation(); onDeleteComment?.(node.id); }} title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={node.isCompleted || false}
                            onChange={(e) => {
                                e.stopPropagation();
                                onToggleComplete(node.id, !node.isCompleted);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>

                {/* Content or Edit Form */}
                {isEditing ? (
                    <div className={styles.editForm} onClick={e => e.stopPropagation()}>
                        <textarea
                            className={styles.editInput}
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            rows={2}
                            autoFocus
                        />
                        <div className={styles.editActions}>
                            <button className={styles.cancelBtn} onClick={() => setIsEditing(false)} disabled={isSubmitting}>Cancel</button>
                            <button className={styles.saveBtn} onClick={handleSaveEdit} disabled={isSubmitting}>Save</button>
                        </div>
                    </div>
                ) : (
                    <p className={styles.commentContent}>{node.content}</p>
                )}
            </div>

            {/* Reply Input */}
            {isReplying && (
                <form onSubmit={handleSubmitReply} className={styles.replyForm}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#9ca3af', marginRight: '0.5rem' }}>
                        <Reply size={16} style={{ transform: 'rotate(180deg)' }} />
                    </div>
                    <input
                        type="text"
                        placeholder="Write a reply..."
                        className={styles.replyInput}
                        value={replyContent}
                        onChange={e => setReplyContent(e.target.value)}
                        autoFocus
                        disabled={isSubmitting}
                    />
                    <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !replyContent.trim()}>
                        <Send size={14} />
                    </button>
                </form>
            )}

            {/* Recursive Children */}
            {node.children.length > 0 && (
                <div className={styles.childComment}>
                    {node.children.map(child => (
                        <CommentItem
                            key={child.id}
                            node={child}
                            currentTime={currentTime}
                            onCommentClick={onCommentClick}
                            onToggleComplete={onToggleComplete}
                            hoveredCommentId={hoveredCommentId}
                            onHoverComment={onHoverComment}
                            onEditComment={onEditComment}
                            onDeleteComment={onDeleteComment}
                            onReplyComment={onReplyComment}
                            currentUserRole={currentUserRole}
                            currentUserId={currentUserId}
                            guestName={guestName}
                            isGuest={isGuest}
                            formatTime={formatTime}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
