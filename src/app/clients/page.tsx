'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { clientService } from '@/services/clientService';
import { Client } from '@/types';
import styles from './styles.module.css';

export default function ClientsPage() {
    const { currentUser, isLoading } = useUser();
    const [clients, setClients] = useState<Client[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

    const loadClients = async () => {
        if (!currentUser?.id) return;
        const data = await clientService.getClients(currentUser.id);
        setClients(data);
    };

    useEffect(() => {
        if (currentUser?.id) {
            loadClients();
        }
    }, [currentUser?.id]);

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientName.trim() || !currentUser?.id) return;

        setIsSubmitting(true);
        const newClient = await clientService.createClient(newClientName.trim(), currentUser.id);

        if (newClient) {
            setClients([...clients, newClient]);
            setIsModalOpen(false);
            setNewClientName('');
        }
        setIsSubmitting(false);
    };

    if (isLoading) return <div className={styles.container}>Loading...</div>;

    if (!currentUser || currentUser.role !== 'engineer') {
        return (
            <div className={styles.container}>
                <h1>Access Denied</h1>
                <p>Only engineers can manage clients.</p>
                <Link href="/dashboard" style={{ color: 'var(--primary)' }}>Back to Clients</Link>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Clients</h1>
                <button
                    className={styles.addBtn}
                    onClick={() => setIsModalOpen(true)}
                >
                    + New Client
                </button>
            </header>

            <div className={styles.clientsGrid}>
                {clients.map(client => (
                    <Link href={`/clients/${client.id}`} key={client.id} className={styles.clientCard}>
                        <div className={styles.clientName}>{client.name}</div>
                        <div className={styles.clientMeta}>
                            Created {new Date(client.createdAt).toLocaleDateString()}
                        </div>
                    </Link>
                ))}
            </div>

            {/* New Client Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2 className={styles.modalTitle}>Add New Client</h2>
                        <form onSubmit={handleCreateClient}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Client Name</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    placeholder="e.g. Acme Corp"
                                    autoFocus
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.cancelBtn}
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setNewClientName('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={isSubmitting || !newClientName.trim()}
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
