'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, FolderInput, Archive, Trash2, Share2, RotateCcw } from 'lucide-react';
import styles from './ActionMenu.module.css';

interface ActionMenuProps {
    type: 'project' | 'client';
    onRename: () => void;
    onMove?: () => void; // Optional for Clients
    onShare?: () => void; // Optional for Clients
    onArchive?: () => void; // Optional if Restoring
    onRestore?: () => void; // Optional for Archived items
    onDelete: () => void;
}

export default function ActionMenu({ type, onRename, onMove, onShare, onArchive, onRestore, onDelete }: ActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        action();
        setIsOpen(false);
    };

    return (
        <div className={styles.container} ref={menuRef}>
            <button
                className={styles.trigger}
                onClick={toggleMenu}
                aria-label="Actions"
            >
                <MoreVertical size={18} />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <button onClick={(e) => handleAction(e, onRename)} className={styles.item}>
                        <Edit2 size={16} />
                        <span>Rename</span>
                    </button>

                    {onShare && (
                        <button onClick={(e) => handleAction(e, onShare)} className={styles.item}>
                            <Share2 size={16} />
                            <span>Share Folder</span>
                        </button>
                    )}

                    {/* Move is only for Projects currently */}
                    {onMove && (
                        <button onClick={(e) => handleAction(e, onMove)} className={styles.item}>
                            <FolderInput size={16} />
                            <span>Move to...</span>
                        </button>
                    )}

                    {onArchive && (
                        <button onClick={(e) => handleAction(e, onArchive)} className={styles.item}>
                            <Archive size={16} />
                            <span>Archive</span>
                        </button>
                    )}

                    {onRestore && (
                        <button onClick={(e) => handleAction(e, onRestore)} className={styles.item}>
                            <RotateCcw size={16} />
                            <span>Restore</span>
                        </button>
                    )}

                    <div className={styles.divider} />

                    <button onClick={(e) => handleAction(e, onDelete)} className={`${styles.item} ${styles.danger}`}>
                        <Trash2 size={16} />
                        <span>Delete</span>
                    </button>
                </div>
            )}
        </div>
    );
}
