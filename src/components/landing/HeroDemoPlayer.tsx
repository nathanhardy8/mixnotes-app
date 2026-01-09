'use client';

import React, { useState } from 'react';
import AudioPlayer from '@/components/AudioPlayer';
import styles from './styles.module.css';

// Mock Comments for Demo
const MOCK_PROJECT_ID = 'demo-project';

const INITIAL_V1_COMMENTS: any[] = [
    {
        id: '1',
        projectId: MOCK_PROJECT_ID,
        authorId: 'guest',
        content: 'Too loud here!',
        timestamp: 5,
        createdAt: new Date().toISOString(),
        authorType: 'CLIENT',
        authorName: 'Client'
    },
    {
        id: '2',
        projectId: MOCK_PROJECT_ID,
        authorId: 'user-1',
        content: 'Fixed in v2',
        timestamp: 5,
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

export default function HeroDemoPlayer() {
    // State
    const [version, setVersion] = useState<'v1' | 'v2'>('v2');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [comments, setComments] = useState(INITIAL_V2_COMMENTS);
    const [commentInput, setCommentInput] = useState('');

    // Sample Audio (Using a publicly available short sample)
    const audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; // Placeholder

    const handleVersionChange = (newVersion: 'v1' | 'v2') => {
        setVersion(newVersion);
        setComments(newVersion === 'v1' ? INITIAL_V1_COMMENTS : INITIAL_V2_COMMENTS);
        setIsPlaying(false);
        setCurrentTime(0); // Reset for effect
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
        // Pause to reflect "real" behavior
        setIsPlaying(false);
    };

    return (
        <div className={styles.demoPlayerWrapper}>
            {/* Version Tabs */}
            <div className={styles.versionTabs}>
                <button
                    onClick={() => handleVersionChange('v1')}
                    className={`${styles.versionTab} ${version === 'v1' ? styles.activeTab : ''}`}
                >
                    Mix_v1.0.mp3
                </button>
                <button
                    onClick={() => handleVersionChange('v2')}
                    className={`${styles.versionTab} ${version === 'v2' ? styles.activeTab : ''}`}
                >
                    Mix_v1.1_final.mp3
                    <span className={styles.badge}>Current</span>
                </button>
            </div>

            {/* Player Area */}
            <div className={styles.playerContainer}>
                {/* Note: In a real app we might memoize the AudioPlayer or handle key changes to force reload 
                    if the URL changed. Here URL is same, but we remount to clear waveform state for "different file" feel. */}
                <AudioPlayer
                    key={version}
                    versions={[{
                        id: version,
                        audioUrl,
                        projectId: MOCK_PROJECT_ID,
                        versionNumber: version === 'v1' ? 1 : 2,
                        createdAt: new Date().toISOString(),
                        originalFilename: version === 'v1' ? 'Mix_v1.0.mp3' : 'Mix_v1.1_final.mp3',
                        isApproved: version === 'v2'
                    }]}
                    activeVersionId={version}
                    isPlaying={isPlaying}
                    onPlayPause={setIsPlaying}
                    onTimeUpdate={setCurrentTime}
                    comments={comments}
                // No seekTo logic needed for simple demo unless we want to jump to comments
                // onMarkerClick logic could be added
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
                    {comments.map(c => (
                        <div key={c.id} className={styles.commentItem}>
                            <div className={styles.commentHeader}>
                                <span className={styles.author}>{c.authorName}</span>
                                <span className={styles.timestamp}>{Math.floor(c.timestamp / 60)}:{Math.floor(c.timestamp % 60).toString().padStart(2, '0')}</span>
                            </div>
                            <div className={styles.content}>{c.content}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
