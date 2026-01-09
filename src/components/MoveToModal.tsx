'use client';

import { useState } from 'react';
import { Client } from '@/types';
import styles from './MoveToModal.module.css'; // Reusing rename modal styles or creating new ones
import { Folder } from 'lucide-react';

interface MoveToModalProps {
    isOpen: boolean;
    onClose: () => void;
    clients: Client[];
    onMove: (clientId: string | null) => void;
}

export default function MoveToModal({ isOpen, onClose, clients, onMove }: MoveToModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h3 className={styles.title}>Move to...</h3>

                <div className={styles.list}>


                    {clients.map(client => (
                        <button key={client.id} className={styles.option} onClick={() => onMove(client.id)}>
                            <Folder className={styles.icon} size={16} />
                            <span>{client.name}</span>
                        </button>
                    ))}
                </div>

                <div className={styles.actions}>
                    <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
