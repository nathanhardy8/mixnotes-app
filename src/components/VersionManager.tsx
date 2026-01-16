
import { useState, useRef, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProjectVersion } from '@/types';
import { GripVertical, Trash2, X, Pencil, Check } from 'lucide-react';
import styles from './VersionManager.module.css';

interface VersionManagerProps {
    versions: ProjectVersion[];
    onReorder: (newOrder: ProjectVersion[]) => void;
    onDelete: (versionId: string) => void;
    onRename: (versionId: string, newName: string) => void;
    onClose: () => void;
}

function SortableItem({ version, onDelete, onRename }: {
    version: ProjectVersion,
    onDelete: (id: string) => void,
    onRename: (id: string, name: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: version.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(version.displayName || `Version ${version.versionNumber}`);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    const handleSave = () => {
        if (name.trim()) {
            onRename(version.id, name.trim());
        } else {
            setName(version.displayName || `Version ${version.versionNumber}`);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setName(version.displayName || `Version ${version.versionNumber}`);
            setIsEditing(false);
        }
    };

    return (
        <div ref={setNodeRef} style={style} className={styles.item}>
            <div className={styles.dragHandle} {...attributes} {...listeners}>
                <GripVertical size={16} />
            </div>

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
                            onClick={e => e.stopPropagation()} // Prevent drag start
                        />
                    </div>
                ) : (
                    <div className={styles.nameRow} onDoubleClick={() => setIsEditing(true)}>
                        <span className={styles.versionName}>
                            {version.displayName || `Version ${version.versionNumber}`}
                        </span>
                        <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
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
                onClick={(e) => {
                    e.stopPropagation(); // prevent drag
                    // Immediate confirmation here or just pass up? Confirm here is safer.
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

export default function VersionManager({ versions, onReorder, onDelete, onRename, onClose }: VersionManagerProps) {
    const [items, setItems] = useState(versions);

    // Update items when props change (e.g. rename happened)
    useEffect(() => {
        setItems(versions);
    }, [versions]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Fix drag sensitivity
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: any) {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = items.findIndex((i) => i.id === active.id);
            const newIndex = items.findIndex((i) => i.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(items, oldIndex, newIndex);
                setItems(newOrder); // Update local visual state
                onReorder(newOrder); // Trigger parent update
            }
        }
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>Manage Versions</h3>
                    <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                <div className={styles.list}>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items}
                            strategy={verticalListSortingStrategy}
                        >
                            {items.map((version) => (
                                <SortableItem
                                    key={version.id}
                                    version={version}
                                    onDelete={onDelete}
                                    onRename={onRename}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

                <div className={styles.footer}>
                    <p className={styles.helpText}>Drag to reorder • Double click to rename</p>
                </div>
            </div>
        </div>
    );
}
