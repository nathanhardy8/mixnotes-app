'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Download, Edit2, FolderInput, Trash2 } from 'lucide-react';
import styles from './ProjectMenu.module.css';
import { Project } from '@/types';
import { useUser } from '@/context/UserContext';

interface ProjectMenuProps {
    project: Project;
    onRename: (project: Project) => void;
    onMove: (project: Project) => void;
    onDelete: (project: Project) => void;
}

export default function ProjectMenu({ project, onRename, onMove, onDelete }: ProjectMenuProps) {
    const { currentUser } = useUser();
    const [isOpen, setIsOpen] = useState(false);

    // Security: Only engineers can see this menu
    if (currentUser?.role !== 'engineer') {
        return null;
    }
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    // Close on click outside
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

    const handleDownload = () => {
        window.open(project.audioUrl, '_blank');
    };

    return (
        <div className={styles.container} ref={menuRef}>
            <button
                className={styles.trigger}
                onClick={toggleMenu}
                aria-label="Project Actions"
            >
                <MoreVertical size={20} />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <button onClick={(e) => handleAction(e, handleDownload)} className={styles.item}>
                        <Download size={16} />
                        <span>Download</span>
                    </button>
                    <button onClick={(e) => handleAction(e, () => onRename(project))} className={styles.item}>
                        <Edit2 size={16} />
                        <span>Rename</span>
                    </button>
                    <button onClick={(e) => handleAction(e, () => onMove(project))} className={styles.item}>
                        <FolderInput size={16} />
                        <span>Move</span>
                    </button>
                    <div className={styles.divider} />
                    <button onClick={(e) => handleAction(e, () => onDelete(project))} className={`${styles.item} ${styles.danger}`}>
                        <Trash2 size={16} />
                        <span>Delete</span>
                    </button>
                </div>
            )}
        </div>
    );
}
