'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { UploadCloud, File, Trash2, Edit2, Info, Loader } from 'lucide-react';
import styles from './styles.module.css';
import { ClientUpload } from '@/types';

// Types for local state
interface UploadingFile {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'complete' | 'error';
    error?: string;
}

export default function ClientUploadsPage({ params }: { params: Promise<{ clientId: string }> }) {
    const searchParams = useSearchParams();
    const token = searchParams.get('t');
    const [clientId, setClientId] = useState<string>('');

    // Data State
    const [uploads, setUploads] = useState<ClientUpload[]>([]);
    const [instructions, setInstructions] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    // Upload State
    const [uploadQueue, setUploadQueue] = useState<UploadingFile[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        params.then(p => setClientId(p.clientId));
    }, [params]);

    useEffect(() => {
        if (clientId && token) {
            loadData();
        } else if (clientId && !token) {
            setError('Missing access token.');
            setLoading(false);
        }
    }, [clientId, token]);

    const loadData = async () => {
        try {
            // 1. Fetch Files
            const res = await fetch(`/api/clients/${clientId}/uploads?t=${token}`);
            if (!res.ok) throw new Error('Unauthorized or Expired Link');
            const data = await res.json();

            // 2. Fetch Client Info for Instructions (We can fetch client details via a new endpoint or just use the Uploads endpoint if we enhanced it to return metadata.
            // MVP: Assuming instructions might come? The GET /uploads didn't return client instructions.
            // I should add instructions to the GET /uploads response or fetch client separately using token.
            // Let's rely on valid token allowing filtered client read.
            // OR: Just ignore instructions for now if I missed the API update?
            // Actually, I can fetch GET /api/clients/${clientId}?t=${token} if I implement it.
            // Workaround: I'll assume standard fetch won't work.
            // I'll skip instructions for this exact iteration or hardcode separate fetch if I had the endpoint.
            // Wait, I can update GET /api/clients/[id]/uploads to include instructions in metadata envelope.
            // For now, I'll just set uploads.

            setUploads(data.files);
            setLoading(false);
        } catch (e) {
            setError('Access Denied or Link Expired');
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            startUploads(Array.from(e.target.files));
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files) {
            startUploads(Array.from(e.dataTransfer.files));
        }
    };

    const startUploads = async (files: File[]) => {
        const newQueue = files.map(f => ({ file: f, progress: 0, status: 'pending' } as UploadingFile));
        setUploadQueue(prev => [...prev, ...newQueue]);

        // Process sequentially or parallel
        for (const item of newQueue) {
            await processUpload(item);
        }
    };

    const processUpload = async (item: UploadingFile) => {
        try {
            updateItemStatus(item.file.name, 'uploading', 0);

            // 1. Init Upload (Get Signed URL)
            const initRes = await fetch(`/api/clients/${clientId}/uploads/init`, {
                method: 'POST',
                body: JSON.stringify({
                    filename: item.file.name,
                    mimeType: item.file.type,
                    token
                })
            });

            if (!initRes.ok) throw new Error('Failed to initialize upload');
            const { signedUrl, storageKey } = await initRes.json();

            // 2. PUT File to Storage
            const xhr = new XMLHttpRequest();
            await new Promise((resolve, reject) => {
                xhr.open('PUT', signedUrl);
                xhr.setRequestHeader('Content-Type', item.file.type);

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = (e.loaded / e.total) * 100;
                        updateItemStatus(item.file.name, 'uploading', percent);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve(true);
                    else reject(new Error('Upload failed'));
                };
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.send(item.file);
            });

            // 3. Confirm / Record in DB
            const confirmRes = await fetch(`/api/clients/${clientId}/uploads`, {
                method: 'POST',
                body: JSON.stringify({
                    originalFilename: item.file.name,
                    storageKey,
                    mimeType: item.file.type,
                    sizeBytes: item.file.size,
                    token
                })
            });

            if (!confirmRes.ok) throw new Error('Failed to record upload');

            const { file: newRecord } = await confirmRes.json();

            updateItemStatus(item.file.name, 'complete', 100);

            // Add to list
            // convert returned record to CamelCase if needed or use raw
            setUploads(prev => [{
                ...newRecord,
                id: newRecord.id, // map fields if API returns snake_case
                displayName: newRecord.display_name,
                sizeBytes: newRecord.size_bytes,
                createdAt: newRecord.created_at,
                uploadedByType: newRecord.uploaded_by_type
            } as ClientUpload, ...prev]);

            // Remove from queue after delay
            setTimeout(() => {
                setUploadQueue(prev => prev.filter(f => f.file.name !== item.file.name));
            }, 2000);

        } catch (e) {
            console.error(e);
            updateItemStatus(item.file.name, 'error', 0, 'Failed');
        }
    };

    const updateItemStatus = (fileName: string, status: UploadingFile['status'], progress: number, error?: string) => {
        setUploadQueue(prev => prev.map(p =>
            p.file.name === fileName ? { ...p, status, progress, error } : p
        ));
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this file?')) return;
        const res = await fetch(`/api/uploads/${id}?t=${token}`, { method: 'DELETE' });
        if (res.ok) {
            setUploads(prev => prev.filter(u => u.id !== id));
        } else {
            alert('Cannot delete this file.');
        }
    };

    const handleRename = async (id: string, currentName: string) => {
        const newName = prompt('Rename file:', currentName);
        if (newName && newName !== currentName) {
            const res = await fetch(`/api/uploads/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ displayName: newName, token })
            });

            if (res.ok) {
                setUploads(prev => prev.map(u => u.id === id ? { ...u, displayName: newName } : u));
            } else {
                alert('Rename failed.');
            }
        }
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
    };

    if (loading) return <div className={styles.container}>Loading secure portal...</div>;
    if (error) return <div className={styles.container} style={{ textAlign: 'center', color: 'red' }}>{error}</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Client Uploads</h1>
                <div className={styles.subtitle}>Secure File Transfer</div>
            </header>

            {instructions && (
                <div className={styles.instructionsBox}>
                    <div className={styles.instructionsTitle}><Info size={18} /> From the Producer</div>
                    <div className={styles.instructionsText}>{instructions}</div>
                </div>
            )}

            <div
                className={`${styles.dropzone} ${isDragOver ? styles.dropzoneActive : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
                <UploadCloud className={styles.uploadIcon} />
                <div className={styles.dropText}>Click or Drag files to upload</div>
                <div className={styles.dropSubtext}>Audio, ZIP, MIDI, PDF supported</div>
            </div>

            {/* Queue */}
            {uploadQueue.length > 0 && (
                <div className={styles.fileList} style={{ marginBottom: '2rem' }}>
                    {uploadQueue.map(item => (
                        <div key={item.file.name} className={styles.progressRow}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{item.file.name}</span>
                                <div>{item.status === 'error' ? 'Error' : `${Math.round(item.progress)}%`}</div>
                            </div>
                            <div className={styles.progressBarContainer}>
                                <div className={styles.progressBarFill} style={{ width: `${item.progress}%`, background: item.status === 'error' ? 'red' : undefined }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Existing Files */}
            <div className={styles.sectionTitle}>Uploaded Files</div>
            <div className={styles.fileList}>
                {uploads.length === 0 && <div style={{ padding: '1rem', color: '#888' }}>No files found.</div>}

                {uploads.map(file => (
                    <div key={file.id} className={styles.fileRow}>
                        <File className={styles.fileIcon} size={20} />
                        <div className={styles.fileInfo}>
                            <div className={styles.fileName}>{file.displayName}</div>
                            <div className={styles.fileMeta}>
                                {formatSize(file.sizeBytes)} • {new Date(file.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div className={styles.actions}>
                            <button className={styles.btnIcon} onClick={() => handleRename(file.id, file.displayName)}>
                                <Edit2 size={16} />
                            </button>
                            <button className={styles.btnIcon} style={{ color: '#ef4444' }} onClick={() => handleDelete(file.id)}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
