'use client';

import React, { useState } from 'react';
import VersionSelector from '@/components/VersionSelector';
import AudioPlayer from '@/components/AudioPlayer';
import { ProjectVersion } from '@/types';
import styles from './styles.module.css';


// Mock Comments for Demo
const MOCK_PROJECT_ID = 'demo-project';

const INITIAL_V1_COMMENTS: any[] = [
    {
        id: '1',
        projectId: MOCK_PROJECT_ID,
        authorId: 'guest',
        content: 'Can you make it sound more full?',
        timestamp: 5,
        createdAt: new Date().toISOString(),
        authorType: 'CLIENT',
        authorName: 'Client'
    },
    {
        id: '1b',
        projectId: MOCK_PROJECT_ID,
        authorId: 'guest',
        content: 'Turn vocals up',
        timestamp: 15,
        createdAt: new Date().toISOString(),
        authorType: 'CLIENT',
        authorName: 'Client'
    },
    {
        id: '2',
        projectId: MOCK_PROJECT_ID,
        authorId: 'user-1',
        content: 'Fixed in v2',
        timestamp: 15,
        createdAt: new Date().toISOString(),
        authorType: 'ENGINEER',
        authorName: 'Engineer'
    }
];

const INITIAL_V2_COMMENTS: any[] = [
    {
        id: '3',
        projectId: MOCK_PROJECT_ID,
        authorId: 'guest',
        content: 'Perfect! Approved.',
        timestamp: 12,
        createdAt: new Date().toISOString(),
        authorType: 'CLIENT',
        authorName: 'Client'
    }
];

// Real Data from "Feels Right" Project
const DEMO_VERSIONS: ProjectVersion[] = [
    {
        id: 'v1',
        projectId: MOCK_PROJECT_ID,
        versionNumber: 1,
        audioUrl: 'https://yxxyeoqtakcewfinfemj.supabase.co/storage/v1/object/public/projects/1768581553852-9pmfp88pok7.mp3',
        createdAt: new Date().toISOString(),
        originalFilename: 'Mix_v1.0.mp3',
        isApproved: false,
        displayOrder: 0,
        displayName: 'Mix v1.0'
    },
    {
        id: 'v2',
        projectId: MOCK_PROJECT_ID,
        versionNumber: 2,
        audioUrl: 'https://yxxyeoqtakcewfinfemj.supabase.co/storage/v1/object/public/projects/1768582338192-lhk7yma49a.mp3',
        createdAt: new Date().toISOString(),
        originalFilename: 'Mix_v1.1_final.mp3',
        isApproved: true,
        displayOrder: 1,
        displayName: 'Final Mix'
    }
];

export default function HeroDemoPlayer() {
    // State
    const [versionId, setVersionId] = useState<string>('v2');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [comments, setComments] = useState(INITIAL_V2_COMMENTS);
    const [commentInput, setCommentInput] = useState('');

    const handleVersionChange = (newVersionId: string) => {
        setVersionId(newVersionId);
        setComments(newVersionId === 'v1' ? INITIAL_V1_COMMENTS : INITIAL_V2_COMMENTS);
        // Seamless switch maintained
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentInput.trim()) return;

        const newComment = {
            id: Date.now().toString(),
            projectId: MOCK_PROJECT_ID,
            authorId: 'guest',
            content: commentInput,
            timestamp: currentTime || 5, // Fallback if 0
            createdAt: new Date().toISOString(),
            authorType: 'CLIENT',
            authorName: 'You'
        };

        setComments([...comments, newComment]);
        setCommentInput('');
        setIsPlaying(false);
    };

    return (
        <div className={styles.demoPlayerWrapper}>
            {/* Version Tabs */}
            <div className={styles.versionSelectorWrapper}>
                <VersionSelector
                    versions={DEMO_VERSIONS}
                    activeVersionId={versionId}
                    onSelect={handleVersionChange}
                    isEngineer={true}
                />
            </div>

            {/* Player Area */}
            <div className={styles.playerContainer}>
                <AudioPlayer
                    activeVersionId={versionId}
                    versions={DEMO_VERSIONS}
                    isPlaying={isPlaying}
                    onPlayPause={setIsPlaying}
                    onTimeUpdate={setCurrentTime}
                    comments={comments}
                />

                {/* Comment Input Simulation */}
                <div className={styles.demoControls}>
                    <form onSubmit={handleCommentSubmit} className={styles.commentForm}>
                        <input
                            type="text"
                            placeholder="Type a comment at current time..."
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            onFocus={() => setIsPlaying(false)} // Auto-pause feature logic
                            className={styles.commentInput}
                        />
                        <button type="submit" className={styles.commentBtn}>Add Note</button>
                    </form>
                </div>

                {/* Comment List (Mini) */}
                <div className={styles.commentList}>
                    {comments.map((c: any) => (
                        <div key={c.id} className={styles.commentItem}>
                            <div className={styles.commentHeader}>
                                <span className={styles.author}>{c.authorName}</span>
                                <span className={styles.timestamp}>
                                    {Math.floor(c.timestamp / 60)}:{Math.floor(c.timestamp % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                            <div className={styles.content}>{c.content}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
