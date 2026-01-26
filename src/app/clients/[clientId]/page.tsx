'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { clientService } from '@/services/clientService';
import { projectService } from '@/services/projectService';
import { Client, Project } from '@/types';
import BatchUploadModal from '@/components/BatchUploadModal';
import styles from '../styles.module.css'; // Reusing styles

export default function ClientDetailsPage({ params }: { params: Promise<{ clientId: string }> }) {
    const { currentUser } = useUser();
    const router = useRouter();
    const [clientId, setClientId] = useState<string>('');
    const [client, setClient] = useState<Client | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    // Unwrap params
    useEffect(() => {
        params.then(p => setClientId(p.clientId));
    }, [params]);

    const loadData = async () => {
        if (!clientId) return;
        const [clientData, projectsData] = await Promise.all([
            clientService.getClientById(clientId),
            projectService.getProjectsByClient(clientId)
        ]);
        setClient(clientData);
        setProjects(projectsData);
    };

    useEffect(() => {
        if (currentUser?.id && clientId) {
            loadData();
        }
    }, [currentUser?.id, clientId]);

    const handleBatchUpload = async (items: { file: File, title: string, clientId: string, revisionLimit: number | null }[]) => {
        for (const item of items) {
            const audioUrl = await projectService.uploadFile(item.file, 'projects');
            if (audioUrl && currentUser?.id) {
                const newProject: Partial<Project> = {
                    title: item.title,
                    description: `Uploaded for ${client?.name}`,
                    audioUrl: audioUrl,
                    engineerId: currentUser.id,
                    clientId: item.clientId,
                    clientIds: [],
                    isLocked: true, // defaulting to locked/paid as per previous logic? Or maybe false? Dashboard defaults to false. Keeping true as per original file, or maybe false? Original had price, implying paid flow. But without price input, maybe default to locked? keeping true.
                    price: 0, // No price input in batch modal
                    revisionLimit: item.revisionLimit
                };

                const created = await projectService.createProject(newProject);
                if (created) {
                    setProjects(prev => [created, ...prev]);
                }
            }
        }
        setIsUploadOpen(false);
    };

    if (!currentUser) return <div>Loading...</div>;

    if (!client) return (
        <div className={styles.container}>
            <Link href="/clients" style={{ color: '#94a3b8', marginBottom: '1rem', display: 'inline-block' }}>← Back to Clients</Link>
            <div>Loading Client or Not Found...</div>
        </div>
    );

    return (
        <div className={styles.container}>
            <Link href="/clients" style={{ color: '#94a3b8', marginBottom: '1rem', display: 'inline-block' }}>← Back to Clients</Link>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{client.name}</h1>
                    <div className={styles.clientMeta}>Client Portal</div>
                </div>
                <button
                    className={styles.addBtn}
                    onClick={() => setIsUploadOpen(true)}
                >
                    + New Project
                </button>
            </header>

            <div className={styles.clientsGrid}>
                {projects.map(project => (
                    <Link href={`/projects/${project.id}`} key={project.id} className={styles.clientCard}>
                        <div className={styles.clientName}>{project.title}</div>
                        <div className={styles.clientMeta}>
                            {project.isLocked ? '🔒 Locked' : '🔓 Open'} • {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                    </Link>
                ))}

                {projects.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                        No projects yet. Click &quot;New Project&quot; to start.
                    </div>
                )}
            </div>

            <BatchUploadModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                files={[]}
                clients={client ? [client] : []}
                initialClientId={clientId}
                defaultRevisionLimit={currentUser?.defaultRevisionLimit}
                onUpload={handleBatchUpload}
                onCreateClient={async () => null}
            />
        </div>
    );
}
