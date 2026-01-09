'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { clientService } from '@/services/clientService';
import { Client, ClientUpload } from '@/types';
import { ChevronLeft, File, Download, Trash2, Link as LinkIcon, Check, Copy, RefreshCw } from 'lucide-react';
import styles from './styles.module.css';

export default function ClientUploadsPage({ params }: { params: Promise<{ clientId: string }> }) {
    const { currentUser } = useUser();
    const router = useRouter();
    const [clientId, setClientId] = useState<string>('');
    const [client, setClient] = useState<Client | null>(null);
    const [uploads, setUploads] = useState<ClientUpload[]>([]);
    const [instructions, setInstructions] = useState('');
    const [magicLink, setMagicLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingInstr, setSavingInstr] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        params.then(p => setClientId(p.clientId));
    }, [params]);

    useEffect(() => {
        if (currentUser && clientId) {
            loadData();
        }
    }, [currentUser, clientId]);

    const loadData = async () => {
        setLoading(true);
        const [c, files] = await Promise.all([
            clientService.getClientById(clientId),
            clientService.getClientUploads(clientId)
        ]);

        if (c) {
            setClient(c);
            setInstructions(c.uploadInstructions || '');
        }
        setUploads(files);
        setLoading(false);
    };

    const handleSaveInstructions = async () => {
        setSavingInstr(true);
        await clientService.updateClientInstructions(clientId, instructions);
        setSavingInstr(false);
    };

    const handleGenerateLink = async () => {
        const url = await clientService.generateClientAccessLink(clientId);
        if (url) setMagicLink(url);
    };

    const handleCopyLink = () => {
        if (magicLink) {
            navigator.clipboard.writeText(magicLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this file? This cannot be undone.')) return;
        const success = await clientService.deleteClientUpload(id);
        if (success) {
            setUploads(uploads.filter(u => u.id !== id));
        } else {
            alert('Failed to delete.');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) return <div className={styles.container}>Loading...</div>;
    if (!client) return <div className={styles.container}>Client not found</div>;

    return (
        <div className={styles.container}>
            <Link href={`/dashboard?client=${clientId}`} className={styles.backLink}>
                <ChevronLeft size={16} /> Back to {client.name}
            </Link>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Client Uploads</h1>
                    <div className={styles.subtitle}>
                        Managing uploads for {client.name}
                    </div>
                </div>
            </header>

            {/* Magic Link Section */}
            <div className={styles.card}>
                <div className={styles.sectionTitle}>
                    Client Access Link
                    {!magicLink && (
                        <button className={styles.btnSecondary} onClick={handleGenerateLink}>
                            Generate Link
                        </button>
                    )}
                </div>
                <p className={styles.meta} style={{ marginBottom: '1rem' }}>
                    Share this link with your client. They can use it to upload files directly to this folder.
                </p>

                {magicLink && (
                    <div className={styles.accessLinkBox}>
                        <LinkIcon size={16} color="#6b7280" />
                        <input className={styles.copyInput} readOnly value={magicLink} />
                        <button className={styles.btnPrimary} style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={handleCopyLink}>
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                )}
            </div>

            {/* Instructions Section */}
            <div className={styles.card}>
                <div className={styles.sectionTitle}>
                    Upload Instructions
                    <button
                        className={styles.btnSecondary}
                        onClick={handleSaveInstructions}
                        disabled={savingInstr}
                    >
                        {savingInstr ? 'Saving...' : 'Save Note'}
                    </button>
                </div>
                <textarea
                    className={styles.instructionsInput}
                    placeholder="Example: Please upload your drum stems and reference track here..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                />
            </div>

            {/* File List */}
            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
                <div className={styles.sectionTitle} style={{ padding: '1.5rem 1.5rem 0' }}>
                    Uploaded Files ({uploads.length})
                    <button className={styles.btnSecondary} onClick={loadData}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                <div className={styles.fileList} style={{ marginTop: '1rem' }}>
                    {uploads.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                            No files uploaded yet.
                        </div>
                    )}

                    {uploads.map(file => (
                        <div key={file.id} className={styles.fileRow}>
                            <File className={styles.icon} size={20} />

                            <div>
                                <div className={styles.fileName}>{file.displayName}</div>
                                <div className={styles.meta}>
                                    {file.uploadedByType === 'CLIENT' ? 'Uploaded by Client' : 'Uploaded by You'}
                                </div>
                            </div>

                            <div className={styles.meta}>{formatSize(file.sizeBytes)}</div>
                            <div className={styles.meta}>{new Date(file.createdAt).toLocaleDateString()}</div>

                            <div className={styles.actions}>
                                <a
                                    href={`/api/uploads/${file.id}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.btnSecondary}
                                    title="Download"
                                >
                                    <Download size={16} />
                                </a>
                                <button
                                    className={styles.btnSecondary}
                                    style={{ color: '#ef4444', borderColor: '#fee2e2' }}
                                    onClick={() => handleDelete(file.id)}
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
