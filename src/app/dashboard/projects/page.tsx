'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { projectService } from '@/services/projectService';
import { Project } from '@/types';
import { Loader, FileAudio, ChevronRight, Search } from 'lucide-react';
import styles from './styles.module.css';

export default function ProjectsPage() {
    const { currentUser, isLoading: userLoading } = useUser();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!currentUser && !userLoading) return;

        const fetchProjects = async () => {
            if (currentUser) {
                setIsLoading(true);
                const data = await projectService.getProjects(currentUser.id);
                setProjects(data);
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, [currentUser, userLoading]);

    const filteredProjects = useMemo(() => {
        if (!searchQuery.trim()) return projects;

        const lowerQ = searchQuery.toLowerCase();
        return projects.filter(p =>
            p.title.toLowerCase().includes(lowerQ) ||
            (p.clientName || '').toLowerCase().includes(lowerQ)
        );
    }, [projects, searchQuery]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (userLoading || isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '50vh', color: '#666' }}>
                <Loader className="spin" size={32} />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Projects</h1>
                <p className={styles.subtitle}>All song projects, newest first.</p>
            </header>

            <div className={styles.controls}>
                <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <Search
                        size={18}
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                    />
                    <input
                        type="text"
                        placeholder="Search projects or clients..."
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '38px' }}
                    />
                </div>
            </div>

            {projects.length === 0 ? (
                <div className={styles.emptyState}>
                    <div style={{ opacity: 0.5, marginBottom: '1rem' }}><FileAudio size={48} /></div>
                    <h3 className={styles.emptyTitle}>No projects yet</h3>
                    <p className={styles.emptyBody}>Create a project to start collecting feedback and approvals.</p>
                </div>
            ) : (
                <div className={styles.listWrapper}>
                    {/* Header Row */}
                    <div className={styles.tableHeader}>
                        <div>Project Name</div>
                        <div className={styles.colClient}>Client</div>
                        <div className={styles.colDate}>Date Added</div>
                        <div className={styles.colArrow}></div>
                    </div>

                    <div className={styles.list}>
                        {filteredProjects.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                No projects match your search.
                            </div>
                        ) : (
                            filteredProjects.map(project => (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.id}`}
                                    className={styles.row}
                                >
                                    <div className={styles.colTitle}>
                                        <FileAudio size={18} className={styles.iconFile} />
                                        <span>{project.title}</span>
                                    </div>
                                    <div className={styles.colClient}>
                                        {project.clientName || 'No Client'}
                                    </div>
                                    <div className={styles.colDate}>
                                        {formatDate(project.createdAt)}
                                    </div>
                                    <div className={styles.colArrow}>
                                        <ChevronRight size={18} color="#cbd5e1" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
