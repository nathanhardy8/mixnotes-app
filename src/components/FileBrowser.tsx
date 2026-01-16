'use client';

import React, { useState } from 'react';
import { Project, Client, ClientUpload } from '@/types';
import styles from './FileBrowser.module.css';
import { Folder, Music, MoreVertical, FileAudio, CloudUpload, File, Search, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import ActionMenu from './ActionMenu';

interface FileBrowserProps {
    clients?: Client[];
    projects?: Project[];
    onClientClick?: (client: Client) => void;
    currentFolderId?: string | null;

    // Actions are lifted up to Dashboard usually, or handled here?
    // Let's pass handlers from parent for cleaner logic
    onRenameClient?: (client: Client, newName: string) => void;
    onRenameProject?: (project: Project, newName: string) => void;
    onDeleteClient?: (client: Client) => void;
    onDeleteProject?: (project: Project) => void;
    onArchiveProject?: (project: Project) => void;
    onMoveProject?: (project: Project) => void;
    onShareClient?: (client: Client) => void; // New Share Handler

    // Client Uploads Integration
    clientUploads?: ClientUpload[];
    onClientFileUpload?: (file: File) => void;
    onDeleteClientUpload?: (upload: ClientUpload) => void;
    onRenameClientUpload?: (upload: ClientUpload, newName: string) => void;

    // Bulk Actions
    onBulkMove?: (projects: Project[]) => void;
    onBulkDelete?: (projects: Project[]) => void;
}

export default function FileBrowser({
    clients = [],
    projects = [],
    onClientClick,
    onRenameClient,
    onRenameProject,
    onDeleteClient,
    onDeleteProject,
    onArchiveProject,
    onMoveProject,
    onShareClient,
    currentFolderId,
    clientUploads = [],
    onClientFileUpload,
    onDeleteClientUpload,
    onRenameClientUpload,
    onBulkMove,
    onBulkDelete
}: FileBrowserProps) {
    const [activeTab, setActiveTab] = useState<'mixes' | 'uploads'>('mixes');
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [renameId, setRenameId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // --- Search & Sort State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState<'newest' | 'nameAsc' | 'nameDesc'>('nameAsc');

    // --- Sort Handler ---
    const handleSortToggle = () => {
        setSortMode(prev => {
            if (prev === 'newest') return 'nameAsc';
            if (prev === 'nameAsc') return 'nameDesc';
            return 'newest';
        });
    };

    // --- Filter & Sort Logic ---
    const getFilteredAndSortedItems = <T extends { id: string; name?: string; title?: string; displayName?: string; createdAt: string }>(items: T[]) => {
        let result = [...items];

        // 1. Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item => {
                const name = item.name || item.title || item.displayName || '';
                return name.toLowerCase().includes(query);
            });
        }

        // 2. Sort
        result.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();

            const nameA = (a.name || a.title || a.displayName || '').toLowerCase();
            const nameB = (b.name || b.title || b.displayName || '').toLowerCase();

            switch (sortMode) {
                case 'newest':
                    return dateB - dateA; // Newest first
                case 'nameAsc':
                    return nameA.localeCompare(nameB);
                case 'nameDesc':
                    return nameB.localeCompare(nameA);
                default:
                    return 0;
            }
        });

        return result;
    };

    const processedClients = React.useMemo(() => getFilteredAndSortedItems(clients), [clients, searchQuery, sortMode]);
    const processedProjects = React.useMemo(() => getFilteredAndSortedItems(projects), [projects, searchQuery, sortMode]);
    const processedUploads = React.useMemo(() => getFilteredAndSortedItems(clientUploads), [clientUploads, searchQuery, sortMode]);


    // Start Rename
    const handleStartRename = (id: string, currentName: string) => {
        setRenameId(id);
        setRenameValue(currentName);
    };

    // Commit Rename
    const handleCommitRename = () => {
        if (!renameId) return;

        // Check if Client Upload
        const upload = clientUploads.find(u => u.id === renameId);
        if (upload && onRenameClientUpload) {
            if (renameValue.trim() && renameValue !== upload.displayName) {
                onRenameClientUpload(upload, renameValue.trim());
            }
        }

        // Check if Client
        const client = clients.find(c => c.id === renameId);
        if (client && onRenameClient) {
            if (renameValue.trim() && renameValue !== client.name) {
                onRenameClient(client, renameValue.trim());
            }
        }

        // Check if Project
        const project = projects.find(p => p.id === renameId);
        if (project && onRenameProject) {
            if (renameValue.trim() && renameValue !== project.title) {
                onRenameProject(project, renameValue.trim());
            }
        }

        setRenameId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCommitRename();
        if (e.key === 'Escape') setRenameId(null);
    };

    // Helper to format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Helper to format size
    const formatSize = (bytes?: number) => {
        if (!bytes) return '-';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
    };



    const hasItems = clients.length > 0 || projects.length > 0 || clientUploads.length > 0;

    // --- Bulk Edit State ---
    const [isBulkEdit, setIsBulkEdit] = useState(false);
    const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

    // --- Bulk Actions ---
    const handleBulkToggle = () => {
        setIsBulkEdit(prev => !prev);
        setSelectedProjectIds(new Set()); // Reset selection
    };

    const handleSelectProject = (projectId: string) => {
        setSelectedProjectIds(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedProjectIds.size === processedProjects.length) {
            setSelectedProjectIds(new Set());
        } else {
            setSelectedProjectIds(new Set(processedProjects.map(p => p.id)));
        }
    };

    const hasSelected = selectedProjectIds.size > 0;

    // Determine if we show tabs (only in folder)
    const showTabs = !!currentFolderId;

    if (!hasItems && !showTabs && !searchQuery) {
        return (
            <div className={styles.emptyState}>
                <div style={{ opacity: 0.5 }}><Folder size={48} /></div>
                <p>This folder is empty</p>
                {/* If folder is empty but we are in a folder, user might want to upload */}
                {!!currentFolderId && onClientFileUpload && (
                    <button className={styles.btnPrimary} onClick={() => fileInputRef.current?.click()}>
                        Upload File
                    </button>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onClientFileUpload) onClientFileUpload(file);
                        // Reset
                        e.target.value = '';
                    }}
                />
            </div>
        );
    }

    return (
        <div className={styles.browserContainer}>
            {/* Control Bar (Search + Sort + Bulk) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
                {isBulkEdit ? (
                    // Bulk Edit Active Header
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                {selectedProjectIds.size} Selected
                            </span>
                            <div style={{ height: '24px', width: '1px', background: 'var(--border)' }}></div>
                            <button
                                style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                                onClick={handleSelectAll}
                            >
                                {selectedProjectIds.size === processedProjects.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                className={styles.btnSecondary}
                                disabled={!hasSelected}
                                onClick={() => {
                                    if (onBulkMove && hasSelected) {
                                        const selected = processedProjects.filter(p => selectedProjectIds.has(p.id));
                                        onBulkMove(selected);
                                        // Exit bulk mode after action? Ideally yes, or wait. 
                                        // User logic will handle modal, so we just trigger.
                                    }
                                }}
                                style={{ opacity: hasSelected ? 1 : 0.5, cursor: hasSelected ? 'pointer' : 'not-allowed' }}
                            >
                                Move
                            </button>
                            <button
                                className={styles.btnSecondary}
                                disabled={!hasSelected}
                                onClick={() => {
                                    if (onBulkDelete && hasSelected) {
                                        const selected = processedProjects.filter(p => selectedProjectIds.has(p.id));
                                        onBulkDelete(selected);
                                    }
                                }}
                                style={{ opacity: hasSelected ? 1 : 0.5, cursor: hasSelected ? 'pointer' : 'not-allowed', color: 'var(--error)' }}
                            >
                                Delete
                            </button>
                            <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }}></div>
                            <button
                                onClick={handleBulkToggle}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--foreground-secondary)' }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    // Standard Header
                    <>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                            <Search className={styles.icon} size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-secondary)' }} />
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px 8px 36px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)',
                                    color: 'var(--foreground)',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleSortToggle}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    color: 'var(--foreground)',
                                    fontWeight: 500
                                }}
                            >
                                {sortMode === 'newest' && <span>Newest First</span>}
                                {sortMode === 'nameAsc' && <><span>Name</span> <ArrowUp size={14} /></>}
                                {sortMode === 'nameDesc' && <><span>Name</span> <ArrowDown size={14} /></>}
                            </button>

                            {/* Only show Bulk Edit if we have projects */}
                            {projects.length > 0 && (
                                <button
                                    onClick={handleBulkToggle}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--surface)',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        color: 'var(--foreground)',
                                        fontWeight: 500
                                    }}
                                >
                                    Bulk Edit
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>


            {/* Tabs Header */}
            {showTabs && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => setActiveTab('mixes')}
                            style={{
                                background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer',
                                fontWeight: activeTab === 'mixes' ? 600 : 400,
                                color: activeTab === 'mixes' ? 'var(--primary)' : 'var(--foreground-secondary)',
                                borderBottom: activeTab === 'mixes' ? '2px solid var(--primary)' : '2px solid transparent'
                            }}
                        >
                            Projects
                        </button>
                        <button
                            onClick={() => setActiveTab('uploads')}
                            style={{
                                background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer',
                                fontWeight: activeTab === 'uploads' ? 600 : 400,
                                color: activeTab === 'uploads' ? 'var(--primary)' : 'var(--foreground-secondary)',
                                borderBottom: activeTab === 'uploads' ? '2px solid var(--primary)' : '2px solid transparent'
                            }}
                        >
                            Client Uploads
                        </button>
                    </div>

                    {activeTab === 'uploads' && (
                        <div>
                            <button
                                className={styles.actionBtn}
                                style={{ background: 'var(--primary)', color: 'white', padding: '6px 12px', fontSize: '0.85rem' }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <CloudUpload size={16} style={{ marginRight: '6px' }} /> Upload
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && onClientFileUpload) onClientFileUpload(file);
                                    e.target.value = '';
                                }}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className={styles.headerRow}>
                <div className={styles.colName}>Name</div>
                <div className={styles.colOwner}>Owner</div>
                <div className={styles.colDate}>Last Modified</div>
                <div className={styles.colSize}>File Size</div>
                <div className={styles.colActions}></div>
            </div>

            <div className={styles.listBody}>
                {/* 1. Mixes View */}
                {(activeTab === 'mixes' || !showTabs) && (
                    <>


                        {/* 1. Clients (Folders) - NO Selection for Folders as per scope */}
                        {processedClients.map(client => (
                            <div
                                key={`client-${client.id}`}
                                className={styles.row}
                                onClick={() => !isBulkEdit && onClientClick?.(client)}
                                style={{ opacity: isBulkEdit ? 0.5 : 1, pointerEvents: isBulkEdit ? 'none' : 'auto' }}
                            >
                                <div className={styles.colName}>
                                    <Folder className={styles.iconFolder} size={20} />
                                    {renameId === client.id ? (
                                        <input
                                            className={styles.renameInput}
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            onBlur={handleCommitRename}
                                            onKeyDown={handleKeyDown}
                                            autoFocus
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className={styles.itemName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {client.name}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.colOwner}>me</div>
                                <div className={styles.colDate}>{formatDate(client.createdAt)}</div>
                                <div className={styles.colSize}>-</div>
                                <div className={styles.colActions}>
                                    {!isBulkEdit && (
                                        <ActionMenu
                                            type="client"
                                            onRename={() => handleStartRename(client.id, client.name)}
                                            onShare={() => onShareClient?.(client)}
                                            onDelete={() => onDeleteClient?.(client)}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* 2. Projects (Files) */}
                        {processedProjects.map(project => {
                            const isSelected = selectedProjectIds.has(project.id);
                            return (
                                <div
                                    key={`proj-${project.id}`}
                                    className={styles.rowWrapper}
                                >
                                    {/* 
                                        In Bulk Mode: Render DIV, click toggles selection
                                        In Normal Mode: Render LINK, click navigates
                                     */}
                                    {isBulkEdit ? (
                                        <div
                                            className={styles.row}
                                            onClick={() => handleSelectProject(project.id)}
                                            style={{ cursor: 'pointer', background: isSelected ? 'var(--surface-alt)' : undefined }}
                                        >
                                            <div className={styles.colName}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', marginRight: '12px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        readOnly
                                                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                                    />
                                                </div>
                                                <FileAudio className={styles.iconFile} size={20} />
                                                <span className={styles.itemName}>{project.title}</span>
                                            </div>
                                            <div className={styles.colOwner}>me</div>
                                            <div className={styles.colDate}>{formatDate(project.createdAt)}</div>
                                            <div className={styles.colSize}>{formatSize(project.sizeBytes)}</div>
                                            <div className={styles.colActions}>
                                                {/* No actions in bulk mode per row */}
                                            </div>
                                        </div>
                                    ) : (
                                        <Link
                                            href={`/projects/${project.id}`}
                                            className={styles.rowLink}
                                        >
                                            <div className={styles.row}>
                                                <div className={styles.colName}>
                                                    <FileAudio className={styles.iconFile} size={20} />
                                                    {renameId === project.id ? (
                                                        <input
                                                            className={styles.renameInput}
                                                            value={renameValue}
                                                            onChange={e => setRenameValue(e.target.value)}
                                                            onBlur={handleCommitRename}
                                                            onKeyDown={handleKeyDown}
                                                            autoFocus
                                                            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                                                        />
                                                    ) : (
                                                        <span className={styles.itemName}>{project.title}</span>
                                                    )}
                                                </div>
                                                <div className={styles.colOwner}>me</div>
                                                <div className={styles.colDate}>{formatDate(project.createdAt)}</div>
                                                <div className={styles.colSize}>{formatSize(project.sizeBytes)}</div>
                                                <div className={styles.colActions}>
                                                    <ActionMenu
                                                        type="project"
                                                        onRename={() => handleStartRename(project.id, project.title)}
                                                        onMove={() => onMoveProject?.(project)}
                                                        onArchive={() => onArchiveProject?.(project)}
                                                        onDelete={() => onDeleteProject?.(project)}
                                                    />
                                                </div>
                                            </div>
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}

                {/* 2. Client Uploads View */}
                {activeTab === 'uploads' && showTabs && (
                    <>
                        {processedUploads.length === 0 ? (
                            <div className={styles.emptyState} style={{ height: '200px' }}>
                                <div style={{ opacity: 0.5 }}><CloudUpload size={48} /></div>
                                <p>No client files uploaded yet.</p>
                            </div>
                        ) : (
                            processedUploads.map(upload => (
                                <div key={upload.id} className={styles.row}>
                                    <div className={styles.colName}>
                                        <File className={styles.iconFile} size={20} style={{ color: '#6b7280' }} />
                                        {renameId === upload.id ? (
                                            <input
                                                className={styles.renameInput}
                                                value={renameValue}
                                                onChange={e => setRenameValue(e.target.value)}
                                                onBlur={handleCommitRename}
                                                onKeyDown={handleKeyDown}
                                                autoFocus
                                                onClick={e => e.stopPropagation()}
                                            />
                                        ) : (
                                            <span className={styles.itemName}>
                                                {upload.displayName}
                                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '8px', fontWeight: 'normal' }}>
                                                    {upload.uploadedByType === 'CLIENT' ? '(Client)' : '(You)'}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.colOwner}>{upload.uploadedByType === 'CLIENT' ? 'Client' : 'me'}</div>
                                    <div className={styles.colDate}>{formatDate(upload.createdAt)}</div>
                                    <div className={styles.colSize}>{formatSize(upload.sizeBytes)}</div>
                                    <div className={styles.colActions}>
                                        <ActionMenu
                                            type="project" // Reuse project menu or create 'upload' type? Project menu has Rename/Delete.
                                            // Ideally we need: Rename, Download, Delete. 
                                            // 'project' type creates Rename, Move, Archive, Delete.
                                            // I'll reuse 'project' but Move/Archive will do nothing if not passed.
                                            // But Download is missing in ActionMenu? Project callback doesn't have download.
                                            // AccessMenu has handleDownload.
                                            // Let's check ActionMenu implementation. 
                                            // Assuming generic menu.
                                            onRename={() => handleStartRename(upload.id, upload.displayName)}
                                            onDelete={() => onDeleteClientUpload?.(upload)}
                                        // We need a specific 'onDownload'. ActionMenu might not have it.
                                        // I will hack it by adding a download link wrapper or modifying ActionMenu.
                                        // For now, let's just use Rename/Delete.
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
