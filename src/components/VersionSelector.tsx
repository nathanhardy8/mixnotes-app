import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DropAnimation,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import styles from './VersionSelector.module.css';
import { ProjectVersion } from '@/types';

interface VersionSelectorProps {
    versions: ProjectVersion[];
    activeVersionId: string | null;
    onSelect: (versionId: string) => void;
    latestVersionId?: string;
    onReorder?: (newOrder: string[]) => void; // IDs only
    isEngineer?: boolean;
}

// Sub-component for individual sortable tabs
function SortableTab({
    version,
    isActive,
    onSelect,
    label,
    isEngineer
}: {
    version: ProjectVersion;
    isActive: boolean;
    onSelect: (id: string) => void;
    label: string;
    isEngineer?: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: version.id,
        disabled: !isEngineer,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        cursor: isEngineer ? (isDragging ? 'grabbing' : 'grab') : 'default',
        opacity: isDragging ? 0.5 : 1,
        // Ensure z-index is handled if needed
        zIndex: isDragging ? 999 : 'auto',
    };

    return (
        <button
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            // We must separate click from drag. dnd-kit handles this via activation constraints on sensors.
            // On Click is strictly for selection.
            onClick={() => {
                if (!isDragging) onSelect(version.id);
            }}
        >
            {label}
            {isActive && <span className={styles.badge}>Current</span>}
        </button>
    );
}

export default function VersionSelector({
    versions,
    activeVersionId,
    onSelect,
    latestVersionId,
    onReorder,
    isEngineer = false
}: VersionSelectorProps) {
    // Local state for optimistic UI updates
    const [items, setItems] = useState(versions);
    const [isDragging, setIsDragging] = useState(false);

    // Sync local state when props change, but NOT if we are dragging
    useEffect(() => {
        if (!isDragging) {
            const sorted = [...versions].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
            setItems(sorted);
        }
    }, [versions, isDragging]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = () => {
        setIsDragging(true);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setIsDragging(false);
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Trigger callback
                if (onReorder) {
                    onReorder(newItems.map(v => v.id));
                }
                return newItems;
            });
        }
    };

    return (
        <div className={styles.container}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            // modifiers could restrict to horizontal axis if needed, but horizontal strategy does mostly that
            >
                <SortableContext
                    items={items.map(v => v.id)}
                    strategy={horizontalListSortingStrategy}
                >
                    {items.map((version) => {
                        const isActive = activeVersionId === version.id;
                        const label = version.displayName || `Version ${version.versionNumber}`;

                        return (
                            <SortableTab
                                key={version.id}
                                version={version}
                                isActive={isActive}
                                onSelect={onSelect}
                                label={label}
                                isEngineer={isEngineer}
                            />
                        );
                    })}
                </SortableContext>
            </DndContext>
        </div>
    );
}
