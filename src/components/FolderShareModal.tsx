import { useState, useEffect } from 'react';
import { X, Copy, RefreshCw, Check, Link as LinkIcon, Lock } from 'lucide-react';
import { clientService } from '@/services/clientService';
import { Client } from '@/types';

interface FolderShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

export default function FolderShareModal({ isOpen, onClose, client }: FolderShareModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [linkData, setLinkData] = useState<{ url?: string; token?: string; exists?: boolean; expiresAt?: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const loadStatus = async () => {
        if (!client) return;
        setIsLoading(true);
        const status = await clientService.getFolderLinkStatus(client.id);
        setLinkData(prev => ({ ...prev, exists: status.exists, expiresAt: status.expiresAt }));
        setIsLoading(false);
    };

    useEffect(() => {
        if (isOpen && client) {
            loadStatus();
        } else {
            setLinkData(null);
            setError('');
            setCopied(false);
        }
    }, [isOpen, client]);

    const handleEnable = async () => {
        if (!client) return;
        setIsLoading(true);
        const res = await clientService.toggleFolderLink(client.id, 'enable');
        if (res.success && res.url) {
            setLinkData({
                url: res.url,
                token: res.token,
                exists: true
            });
            setError('');
        } else {
            setError(res.error || 'Failed to enable link');
        }
        setIsLoading(false);
    };

    const handleRevoke = async () => {
        if (!client) return;
        if (!confirm('Are you sure you want to revoke this link? The client will lose access immediately.')) return;

        setIsLoading(true);
        const res = await clientService.toggleFolderLink(client.id, 'revoke');
        if (res.success) {
            setLinkData(prev => ({ ...prev, exists: false, url: undefined, token: undefined }));
            setError('');
        } else {
            setError(res.error || 'Failed to revoke link');
        }
        setIsLoading(false);
    };

    const handleCopy = () => {
        if (linkData?.url) {
            navigator.clipboard.writeText(linkData.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <div style={headerStyle}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Share Folder Link</h3>
                    <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
                </div>

                <div style={contentStyle}>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        This creates a secure link for <strong>{client?.name}</strong> to view all projects and upload files without logging in.
                    </p>

                    {isLoading && <div style={{ marginBottom: '1rem', color: '#64748b' }}>Processing...</div>}

                    {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                    {/* State: Link is Visible (Active) */}
                    {linkData?.exists && linkData?.url ? (
                        <div style={linkBoxStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Active Link</span>
                                <button
                                    onClick={handleRevoke}
                                    disabled={isLoading}
                                    style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: '#ef4444', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {isLoading ? 'Processing...' : 'Revoke Access'}
                                </button>
                            </div>
                            <div style={inputGroupStyle}>
                                <input
                                    readOnly
                                    value={linkData.url}
                                    style={inputStyle}
                                    onClick={(e) => e.currentTarget.select()}
                                />
                                <button onClick={handleCopy} style={copyBtnStyle}>
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                                This link never expires. You can revoke it at any time.
                            </div>
                        </div>
                    ) : (
                        // State: No Active Link (Revoked or New)
                        <div>
                            <div style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                                Access is currently disabled. Enable sharing to get a link.
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={handleEnable}
                                    style={primaryBtnStyle}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Enabling...' : 'Enable Share Link'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Basic Inline Styles for speed
const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const modalStyle: React.CSSProperties = {
    background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
    padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};

const contentStyle: React.CSSProperties = {
    padding: '1.5rem'
};

const closeBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b'
};

const primaryBtnStyle: React.CSSProperties = {
    background: '#2563eb', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px',
    fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', width: '100%'
};

const linkBoxStyle: React.CSSProperties = {
    background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0'
};

const inputGroupStyle: React.CSSProperties = {
    display: 'flex', gap: '0.5rem'
};

const inputStyle: React.CSSProperties = {
    flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem',
    background: 'white', color: '#334155'
};

const copyBtnStyle: React.CSSProperties = {
    padding: '0 1rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569'
};
