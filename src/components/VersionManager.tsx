
import { useState, useRef, useEffect } from 'react';
import { ProjectVersion } from '@/types';
import { Trash2, X, Pencil } from 'lucide-react';
import styles from './VersionManager.module.css';

interface VersionManagerProps {
    versions: ProjectVersion[];
    onDelete: (versionId: string) => void;
    onRename: (versionId: string, newName: string) => void;
    onClose: () => void;
}

function VersionItem({ version, index, onDelete, onRename }: {
    version: ProjectVersion,
    index: number,
    onDelete: (id: string) => void,
    onRename: (id: string, name: string) => void
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(version.displayName || `Version ${index + 1}`);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    const handleSave = () => {
        if (name.trim()) {
            onRename(version.id, name.trim());
        } else {
            setName(version.displayName || `Version ${index + 1}`);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setName(version.displayName || `Version ${index + 1}`);
            setIsEditing(false);
        }
    };

    return (
        <div className={styles.item}>
            <div className={styles.info}>
                {isEditing ? (
                    <div className={styles.editContainer}>
                        <input
                            ref={inputRef}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={handleKeyDown}
                            className={styles.nameInput}
                        />
                    </div>
                ) : (
                    <div className={styles.nameRow} onDoubleClick={() => setIsEditing(true)}>
                        <span className={styles.versionName}>
                            {version.displayName || `Version ${index + 1}`}
                        </span>
                        <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                            <Pencil size={12} />
                        </button>
                    </div>
                )}

                {version.originalFilename && (
                    <span className={styles.filename}>{version.originalFilename}</span>
                )}
            </div>

            <button
                className={styles.deleteBtn}
                onClick={() => {
                    if (confirm("Delete this version? This cannot be undone.")) {
                        onDelete(version.id);
                    }
                }}
                title="Delete Version"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

export default function VersionManager({ versions, onDelete, onRename, onClose }: VersionManagerProps) {
    const [items, setItems] = useState(versions);

    // Update items when props change
    useEffect(() => {
        setItems(versions);
    }, [versions]);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>Manage Versions</h3>
                    <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                <div className={styles.list}>
                    {items.map((version, index) => (
                        <VersionItem
                            key={version.id}
                            version={version}
                            index={index}
                            onDelete={onDelete}
                            onRename={onRename}
                        />
                    ))}
                </div>

                <div className={styles.footer}>
                    <p className={styles.helpText}>Double click to rename</p>
                </div>
            </div>
        </div>
    );
}
