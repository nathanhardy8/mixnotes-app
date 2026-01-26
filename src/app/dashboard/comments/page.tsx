'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { projectService } from '@/services/projectService';
import { Loader, ChevronRight, MessageSquare } from 'lucide-react';
import styles from './styles.module.css';

interface InboxItem {
    projectId: string;
    title: string;
    clientId: string | null;
    clientName: string;
    totalComments: number;
    unresolvedComments: number;
    latestCommentAt: string;
}

export default function CommentsPage() {
    const { currentUser, isLoading: userLoading } = useUser();
    const router = useRouter();
    const [items, setItems] = useState<InboxItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadInbox = async () => {
        setIsLoading(true);
        if (currentUser) {
            const data = await projectService.getProjectsWithComments(currentUser.id);
            setItems(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (!currentUser && !userLoading) {
            // Wait for auth
            return;
        }
        if (currentUser) {
            loadInbox();
        }
    }, [currentUser, userLoading]);

    if (userLoading || isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '50vh', color: '#666' }}>
                <Loader className="spin" size={32} />
            </div>
        );
    }

    const unaddressedCount = items.filter(i => i.unresolvedComments > 0).length;
    const hasAnyComments = items.length > 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Inbox</h1>
                <p className={styles.subtitle}>
                    {hasAnyComments
                        ? `You have ${items.length} project(s) with comments.`
                        : 'No active threads.'}
                </p>
            </header>

            {!hasAnyComments ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <MessageSquare size={48} color="#cbd5e1" />
                    </div>
                    <h3 className={styles.emptyTitle}>No comments yet</h3>
                    <p className={styles.emptyBody}>When clients leave feedback, you&apos;ll see it here.</p>
                </div>
            ) : (
                <div className={styles.feed}>
                    {items.map(item => (
                        <Link
                            key={item.projectId}
                            href={`/projects/${item.projectId}`}
                            className={styles.itemCard}
                        >
                            <div className={styles.itemLeft}>
                                <div className={styles.itemHeader}>
                                    <span className={styles.projectTitle}>{item.title}</span>
                                    <span className={styles.clientName}>{item.clientName}</span>
                                </div>
                                <div className={styles.commentStatus}>
                                    {item.unresolvedComments > 0 ? (
                                        <span className={styles.unresolvedText}>
                                            {item.unresolvedComments} comments to review
                                        </span>
                                    ) : (
                                        <span className={styles.resolvedText}>
                                            All comments resolved ({item.totalComments} total)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className={styles.itemRight}>
                                <ChevronRight size={20} color="#94a3b8" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
