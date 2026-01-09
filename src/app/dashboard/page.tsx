'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useProjects } from '@/context/ProjectContext';
import { projectService } from '@/services/projectService';
import { clientService } from '@/services/clientService';
import { Project, Client, ClientUpload } from '@/types';
import RenameModal from '@/components/RenameModal';
import FileBrowser from '@/components/FileBrowser';
import StorageIndicator from '@/components/StorageIndicator';
import MoveToModal from '@/components/MoveToModal';
import FolderShareModal from '@/components/FolderShareModal';
import { ChevronRight, Home, FolderPlus, Share } from 'lucide-react';
import styles from './styles.module.css';

import DropZoneOverlay from '@/components/DropZoneOverlay';
import BatchUploadModal from '@/components/BatchUploadModal';

export default function Dashboard() {
    const { currentUser } = useUser();
    const { projects, addProject, updateProject, deleteProject } = useProjects();
    const router = useRouter();
    const searchParams = useSearchParams();

    // State
    // State
    const [clients, setClients] = useState<Client[]>([]);
    const [clientUploads, setClientUploads] = useState<ClientUpload[]>([]);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [shareClient, setShareClient] = useState<Client | null>(null);

    // Drag & Drop State
    const [isDragging, setIsDragging] = useState(false);
    const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
    const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);

    // Navigation State
    const folderId = searchParams.get('client'); // If present, we are in a folder
    const currentFolder = useMemo(() => clients.find(c => c.id === folderId), [clients, folderId]);

    // Data Fetching
    useEffect(() => {
        if (currentUser?.id) {
            clientService.getClients(currentUser.id, currentUser.role).then(setClients);
        }
    }, [currentUser?.id, currentUser?.role]);

    // Fetch Client Uploads when folder is open
    useEffect(() => {
        if (folderId) {
            clientService.getClientUploads(folderId).then(setClientUploads);
        } else {
            setClientUploads([]);
        }
    }, [folderId]);

    // Drag & Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        // Only show if user has permission
        if (currentUser?.role !== 'engineer' && currentUser?.role !== 'admin') return;
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // Check if we are actually leaving the container (and not just entering a child)
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (currentUser?.role !== 'engineer' && currentUser?.role !== 'admin') return;

        const files = Array.from(e.dataTransfer.files).filter(file => {
            // Basic Audio Mime Type Check or Extension Check
            const validExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'];
            return file.type.startsWith('audio/') || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        });

        if (files.length > 0) {
            setDroppedFiles(files);
            setIsBatchUploadOpen(true);
        } else {
            // Toast or alert if dropped content was invalid
            if (e.dataTransfer.files.length > 0) {
                alert("Only audio files are supported.");
            }
        }
    };

    // Derived Data
    const filteredProjects = useMemo(() => {
        let list = projects;

        // Filter by Folder
        if (folderId) {
            list = list.filter(p => p.clientId === folderId);
        } else {
            // Root: Show projects with NO client
            list = list.filter(p => !p.clientId);
        }

        // Filter out archived
        list = list.filter(p => !p.archivedAt);

        return list;
    }, [projects, folderId]);

    // Calculate Storage
    const totalUsedBytes = useMemo(() => {
        return projects.reduce((acc, p) => acc + (p.sizeBytes || 0), 0);
    }, [projects]);

    // Handlers
    // Handlers
    const handleUpload = async (title: string, file: File, revisionLimit: number | null) => {
        const audioUrl = await projectService.uploadFile(file, 'projects');
        if (!audioUrl) {
            alert('Failed to upload audio file.');
            return;
        }

        const newProject: Partial<Project> = {
            title,
            description: `Uploaded ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
            audioUrl: audioUrl,
            engineerId: currentUser?.id,
            isLocked: false, // Default to unlocked since no payment
            price: 0,
            sizeBytes: file.size,
            clientId: folderId || undefined, // Assign to current folder if open
            revisionLimit: revisionLimit
        };

        await addProject(newProject);
        setIsBatchUploadOpen(false);
    };

    const handleBatchUpload = async (items: { file: File, title: string, clientId: string }[]) => {
        // Process sequentially to be safe, or parallel? 
        // Parallel is fine for uploads usually, but `addProject` updates context.
        // Let's do parallel uploads -> sequential DB inserts.

        for (const item of items) {
            const audioUrl = await projectService.uploadFile(item.file, 'projects');
            if (audioUrl) {
                const newProject: Partial<Project> = {
                    title: item.title,
                    description: `Uploaded ${item.file.name} (${(item.file.size / 1024 / 1024).toFixed(2)} MB)`,
                    audioUrl: audioUrl,
                    engineerId: currentUser?.id,
                    isLocked: false,
                    price: 0,
                    sizeBytes: item.file.size,
                    clientId: item.clientId,
                    revisionLimit: (currentUser?.defaultRevisionLimit === null || currentUser?.defaultRevisionLimit === undefined) ? null : currentUser.defaultRevisionLimit
                };
                await addProject(newProject);
            }
        }

        // Refresh local projects if needed (addProject handles context)
        // Refresh clients if needed? Not for projects.
        // Close modal handled by component on success.
    };

    const handleClientClick = (client: Client) => {
        router.push(`/dashboard?client=${client.id}`);
    };

    // Returns the client object (for the modal)
    const handleCreateClientAsync = async (): Promise<Client | null> => {
        const name = prompt("Enter new Client Name:");
        if (name && currentUser?.id) {
            const newClient = await clientService.createClient(name, currentUser.id);
            if (newClient) {
                setClients(prev => [...prev, newClient]);
                return newClient;
            }
        }
        return null;
    };

    const handleCreateClient = async () => {
        await handleCreateClientAsync();
    };

    const handleShareClient = (client: Client) => {
        setShareClient(client);
        setIsShareOpen(true);
    };

    const navigateRoot = () => router.push('/dashboard');

    // --- Action Handlers ---

    // Rename
    const onRenameClient = async (client: Client, newName: string) => {
        // Optimistic Update
        const oldClients = [...clients];
        setClients(prev => prev.map(c => c.id === client.id ? { ...c, name: newName } : c));

        const updatedClient = await clientService.updateClientAPI(client.id, { name: newName });

        if (updatedClient) {
            // Confirm with server data (source of truth)
            setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
        } else {
            // Revert on failure
            alert("Rename failed. Please try again.");
            setClients(oldClients);
        }
    };

    const onRenameProject = async (project: Project, newTitle: string) => {
        // Optimistic Update
        const oldProject = { ...project };
        await updateProject({ ...project, title: newTitle }); // Update context/local state immediately

        const updatedProject = await projectService.updateProjectAPI(project.id, { title: newTitle });

        if (updatedProject) {
            // Confirm with server data (source of truth)
            await updateProject(updatedProject);
        } else {
            // Revert on failure
            alert("Rename failed. Please try again.");
            await updateProject(oldProject);
        }
    };

    // Archive / Delete
    const onDeleteClient = async (client: Client) => {
        if (!confirm(`Permanently delete folder "${client.name}"? This will delete ALL ${projects.filter(p => p.clientId === client.id).length} projects inside it.`)) return;

        // Optimistic Update: Remove Client locally
        setClients(prev => prev.filter(c => c.id !== client.id));

        const result = await clientService.deleteClientAPI(client.id);
        if (result.success) {
            window.location.reload();
            if (folderId === client.id) {
                router.push('/dashboard');
            }
        } else {
            alert(`Failed to delete client folder: ${result.error}`);
            // Revert optimistic client removal
            if (currentUser?.id) {
                clientService.getClients(currentUser.id, currentUser.role).then(setClients);
            }
        }
    };

    const onArchiveProject = async (project: Project) => {
        if (!confirm(`Archive "${project.title}"?`)) return;

        // Optimistic
        const archivedProject = { ...project, archivedAt: new Date().toISOString() };
        await updateProject(archivedProject); // Removes from list immediately due to filter

        const result = await projectService.updateProjectAPI(project.id, { archivedAt: new Date().toISOString() });

        if (result) {
            // Confirm with server data
            await updateProject(result);
        } else {
            // Revert
            alert("Archive failed. Please try again.");
            await updateProject(project);
        }
    };

    const onDeleteProject = async (project: Project) => {
        if (!confirm(`Permanently delete "${project.title}"? This cannot be undone.`)) return;
        const success = await deleteProject(project.id);
        if (!success) {
            alert("Failed to delete project. Please try again.");
        }
    };

    // Client Upload Handlers
    const handleClientFileDelete = async (upload: ClientUpload) => {
        if (!confirm(`Permanently delete "${upload.displayName}"?`)) return;
        // Optimistic
        setClientUploads(prev => prev.filter(u => u.id !== upload.id));
        const success = await clientService.deleteClientUpload(upload.id);
        if (!success) {
            alert("Failed to delete file.");
            // Revert
            if (folderId) clientService.getClientUploads(folderId).then(setClientUploads);
        }
    };

    const handleClientFileRename = async (upload: ClientUpload, newName: string) => {
        // Optimistic
        setClientUploads(prev => prev.map(u => u.id === upload.id ? { ...u, displayName: newName } : u));
        const success = await clientService.renameClientUpload(upload.id, newName);
        if (!success) {
            alert("Failed to rename file.");
            if (folderId) clientService.getClientUploads(folderId).then(setClientUploads);
        }
    };

    const handleClientFileUpload = async (file: File) => {
        if (!folderId) return;

        // 1. Upload to Storage
        const storageKey = `${folderId}/${Date.now()}_${file.name}`;
        const audioUrl = await projectService.uploadFileDirect(file, 'client-uploads', storageKey); // Need to ensure this exists or use projectService logic

        if (!audioUrl) {
            alert("Failed to upload file to storage.");
            return;
        }

        // 2. Create DB Record
        const newUpload = await clientService.createClientUpload(folderId, {
            originalFilename: file.name,
            storageKey: storageKey,
            mimeType: file.type,
            sizeBytes: file.size
        });

        if (newUpload) {
            setClientUploads(prev => [newUpload, ...prev]);
        } else {
            alert("Failed to record upload.");
        }
    };

    // Move
    const [moveTargetProject, setMoveTargetProject] = useState<Project | null>(null);
    const [isMoveOpen, setIsMoveOpen] = useState(false);

    const onMoveProjectStart = (project: Project) => {
        setMoveTargetProject(project);
        setIsMoveOpen(true);
    };

    const onMoveProjectCommit = async (targetClientId: string | null) => {
        if (moveTargetProject) {
            const success = await projectService.updateProjectAPI(moveTargetProject.id, { clientId: targetClientId || undefined });
            if (success) {
                // Update local context
                await updateProject({ ...moveTargetProject, clientId: targetClientId || undefined });
            }
        }
        setIsMoveOpen(false);
        setMoveTargetProject(null);
    };

    return (
        <div
            className={styles.container}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Header / Breadcrumbs */}
            <header className={styles.header}>
                <div className={styles.breadcrumbs}>
                    <button onClick={navigateRoot} className={styles.crumbBtn}>
                        <Home size={18} />
                        <span>Clients</span>
                    </button>
                    {currentFolder && (
                        <>
                            <ChevronRight size={16} color="#9ca3af" />
                            <span className={styles.crumbActive}>{currentFolder.name}</span>
                        </>
                    )}
                </div>

                <div className={styles.actions}>
                    {/* Folder Level Root Actions */}
                    {!folderId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '12px' }}>
                            <button className={styles.btnSecondary} onClick={handleCreateClient}>
                                <FolderPlus size={16} /> New Client Folder
                            </button>
                        </div>
                    )}
                    {folderId && (
                        <>
                            {(currentUser?.role === 'admin' || currentUser?.role === 'engineer') && (
                                <button className={styles.btnSecondary} onClick={() => setIsShareOpen(true)} style={{ marginRight: '8px' }}>
                                    <Share size={16} /> Share Folder
                                </button>
                            )}
                            <button className="btn-primary" onClick={() => setIsBatchUploadOpen(true)}>
                                + New Project
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Main Content: File Browser */}
            <div className={styles.contentArea}>
                <FileBrowser
                    clients={!folderId ? clients : []} // Only show folders in root
                    projects={filteredProjects}
                    onClientClick={handleClientClick}
                    clientUploads={clientUploads}
                    onClientFileUpload={handleClientFileUpload}
                    onDeleteClientUpload={handleClientFileDelete}
                    onRenameClientUpload={handleClientFileRename}

                    onRenameClient={onRenameClient}
                    onRenameProject={onRenameProject}
                    onDeleteClient={onDeleteClient}
                    onDeleteProject={onDeleteProject}
                    onArchiveProject={onArchiveProject}
                    onMoveProject={onMoveProjectStart}
                    onShareClient={(currentUser?.role === 'admin' || currentUser?.role === 'engineer') ? handleShareClient : undefined}
                    currentFolderId={folderId}
                />
            </div>

            {/* Drops & Modals */}
            <DropZoneOverlay isVisible={isDragging} />

            <BatchUploadModal
                isOpen={isBatchUploadOpen}
                onClose={() => { setIsBatchUploadOpen(false); setDroppedFiles([]); }}
                files={droppedFiles}
                clients={clients}
                initialClientId={folderId}
                defaultRevisionLimit={currentUser?.defaultRevisionLimit}
                onUpload={handleBatchUpload}
                onCreateClient={handleCreateClientAsync}
            />

            {/* Storage Footer */}
            <StorageIndicator totalUsedBytes={totalUsedBytes} />



            <MoveToModal
                isOpen={isMoveOpen}
                onClose={() => setIsMoveOpen(false)}
                clients={clients}
                onMove={onMoveProjectCommit}
            />

            <FolderShareModal
                isOpen={isShareOpen}
                onClose={() => { setIsShareOpen(false); setShareClient(null); }}
                client={shareClient || currentFolder || null}
            />
        </div>
    );
}
