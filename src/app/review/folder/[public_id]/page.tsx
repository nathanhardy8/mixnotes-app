'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader, Folder, UploadCloud, Music, Calendar } from 'lucide-react';
import Link from 'next/link';
import styles from './styles.module.css';

interface ProjectSummary {
    id: string;
    title: string;
    review_public_id?: string;
    created_at: string;
    audio_url?: string;
}

export default function ClientFolderPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const publicId = params?.public_id as string;
    const token = searchParams?.get('t');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientId, setClientId] = useState('');
    const [projects, setProjects] = useState<ProjectSummary[]>([]);

    useEffect(() => {
        if (publicId && token) {
            validateFolder();
        } else {
            setError('Invalid access link.');
            setLoading(false);
        }
    }, [publicId, token]);

    const validateFolder = async () => {
        try {
            const res = await fetch('/api/review/folder/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId, token })
            });
            const data = await res.json();

            if (data.success) {
                setClientName(data.clientName);
                setClientId(data.clientId);
                setProjects(data.projects || []);
            } else {
                setError(data.error || 'Access denied');
            }
        } catch (e) {
            setError('Failed to load folder');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <Loader className="spin" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container} style={{ textAlign: 'center', marginTop: '4rem' }}>
                <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                        Access Unavailable
                    </h2>
                    <p style={{ color: '#64748b', lineHeight: 1.5 }}>
                        {error === 'Link disabled' || error === 'Link revoked'
                            ? 'This share link has been disabled by the owner.'
                            : 'The link you used is invalid or has expired.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Folder size={32} color="#3b82f6" />
                    <h1 className={styles.clientName}>{clientName}</h1>
                </div>
                <div className={styles.meta}>Shared Folder • {projects.length} Project{projects.length !== 1 ? 's' : ''}</div>
            </header>

            <div className={styles.grid}>
                {/* Uploads Link */}
                <Link
                    href={`/review/client/${clientId}/uploads?t=${token}`}
                    className={`${styles.card} ${styles.uploadCard}`}
                >
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div className={styles.cardIcon}>
                            <UploadCloud size={24} />
                        </div>
                        <div className={styles.cardContent}>
                            <div className={styles.cardTitle}>Client Uploads</div>
                            <div className={styles.cardSubtitle}>Upload stems and other files here</div>
                        </div>
                    </div>
                </Link>

                <div className={styles.sectionTitle} style={{ marginTop: '1rem' }}>Projects</div>

                {projects.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
                        No projects in this folder yet.
                    </div>
                ) : (
                    projects.map(project => {
                        if (!project.review_public_id) return null;

                        return (
                            <Link
                                key={project.id}
                                href={`/review/${project.review_public_id}?t=${token}`}
                                className={styles.card}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                    <div className={styles.cardIcon} style={{ background: '#f8fafc', color: '#4b5563' }}>
                                        <Music size={24} />
                                    </div>
                                    <div className={styles.cardContent}>
                                        <div className={styles.cardTitle}>{project.title}</div>
                                        <div className={styles.cardSubtitle} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={12} />
                                            {new Date(project.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
