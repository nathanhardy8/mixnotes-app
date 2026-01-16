'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Comment, ProjectVersion } from '@/types';
import styles from './AudioPlayer.module.css';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
    versions: ProjectVersion[];
    activeVersionId: string;
    onTimeUpdate?: (time: number) => void;
    seekTo?: { time: number; timestamp: number } | null;
    isPlaying: boolean;
    onPlayPause: (playing: boolean) => void;
    comments?: Comment[];
    onMarkerClick?: (commentId: string) => void;
    onMarkerHover?: (id: string | null) => void;
    highlightedCommentId?: string | null;
}

export default function AudioPlayer({
    versions = [],
    activeVersionId,
    onTimeUpdate,
    seekTo,
    isPlaying,
    onPlayPause,
    comments = [],
    onMarkerClick,
    onMarkerHover,
    highlightedCommentId
}: AudioPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);

    // Audio Elements Cache { versionId: HTMLAudioElement }
    const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

    // State
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isReady, setIsReady] = useState(false);

    // Sync Loop Ref
    const rafIdRef = useRef<number | null>(null);

    // -- Initialize Audio Elements --
    useEffect(() => {
        versions.forEach(v => {
            if (!audioRefs.current[v.id]) {
                const audio = new Audio();
                audio.src = v.audioUrl;
                audio.preload = 'auto';
                audio.crossOrigin = 'anonymous'; // Good practice

                // Listeners
                audio.addEventListener('loadedmetadata', () => {
                    if (v.id === activeVersionId) {
                        setDuration(audio.duration);
                        setIsReady(true);
                    }
                });

                audio.addEventListener('ended', () => {
                    if (v.id === activeVersionId) onPlayPause(false);
                });

                audio.addEventListener('error', (e) => {
                    console.error("Audio Load Error:", v.id, audio.src, e);
                });

                audioRefs.current[v.id] = audio;
            }
        });

        // Cleanup all audio on unmount
        return () => {
            Object.values(audioRefs.current).forEach(audio => {
                audio.pause();
                audio.src = '';
                audio.load(); // Reset
            });
            audioRefs.current = {};
        };
    }, [versions]);

    // -- WaveSurfer Visual --
    useEffect(() => {
        if (!containerRef.current) return;

        if (wavesurferRef.current) wavesurferRef.current.destroy();

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#d1d5db',
            progressColor: '#3b82f6',
            cursorColor: '#3b82f6',
            barWidth: 1,
            barGap: 0.5,
            barRadius: 2,
            height: 128,
            normalize: true,
            minPxPerSec: 0,
            interact: true, // Allow scrubbing
        });

        // Visual Only
        ws.setVolume(0);

        // Interactions -> Seek
        ws.on('interaction', (newTime) => {
            seekToSeconds(newTime);
        });

        wavesurferRef.current = ws;

        return () => ws.destroy();
    }, []);

    // -- Switching Logic --
    useEffect(() => {
        const targetAudio = audioRefs.current[activeVersionId];
        if (!targetAudio) return;

        // Visuals
        const v = versions.find(x => x.id === activeVersionId);
        if (v && wavesurferRef.current) {
            wavesurferRef.current.load(v.audioUrl);
        }

        // Seamless Source Switch
        // 1. Capture current state
        const prevAudio = Object.values(audioRefs.current).find(a => !a.paused && a !== targetAudio);
        const time = currentTime;

        // 2. Prepare Target
        if (Number.isFinite(targetAudio.duration)) setDuration(targetAudio.duration);
        else setIsReady(targetAudio.readyState >= 1); // Check metadata loaded

        targetAudio.currentTime = time;

        // 3. Crossfade / Swap
        if (isPlaying) {
            const playPromise = targetAudio.play();
            if (playPromise) {
                playPromise.then(() => {
                    // Success
                    if (prevAudio) {
                        // Fade out prev? HTML5 fade is manual interval. 
                        // For now, hard stop is safer than async fade which might glitch.
                        prevAudio.pause();
                    }
                }).catch(e => console.error("Play error:", e));
            }
        } else {
            // Just pause everyone else
            Object.values(audioRefs.current).forEach(a => {
                if (a !== targetAudio) a.pause();
            });
        }

    }, [activeVersionId]);

    // -- Play/Pause Control --
    useEffect(() => {
        const audio = audioRefs.current[activeVersionId];
        if (!audio) return;

        if (isPlaying) {
            audio.play().catch(e => console.error("Play failed:", e));
        } else {
            audio.pause();
        }
    }, [isPlaying]);

    // Track active version for stale closures
    const activeVersionIdRef = useRef(activeVersionId);
    useEffect(() => { activeVersionIdRef.current = activeVersionId; }, [activeVersionId]);

    // -- Seek Control --
    const seekToSeconds = (time: number) => {
        const currentVersionId = activeVersionIdRef.current;
        const audio = audioRefs.current[currentVersionId];
        if (!audio) return;

        const safeTime = Math.max(0, Math.min(time, audio.duration || 0));
        audio.currentTime = safeTime;
        setCurrentTime(safeTime);

        if (wavesurferRef.current) {
            wavesurferRef.current.setTime(safeTime);
        }
    };

    useEffect(() => {
        if (seekTo) seekToSeconds(seekTo.time);
    }, [seekTo]);


    // -- Sync Loop (RAF) --
    const tick = useCallback(() => {
        if (!isPlaying) return;

        const audio = audioRefs.current[activeVersionId];
        if (audio) {
            const t = audio.currentTime;
            setCurrentTime(t);
            onTimeUpdate?.(t);

            // Sync Visuals
            if (wavesurferRef.current) {
                // Only seek if significantly diff to avoid jitter?
                // WaveSurfer setTime is visual seek.
                const diff = Math.abs(wavesurferRef.current.getCurrentTime() - t);
                if (diff > 0.1) {
                    wavesurferRef.current.setTime(t);
                }
            }
        }

        rafIdRef.current = requestAnimationFrame(tick);
    }, [activeVersionId, isPlaying, onTimeUpdate]);

    useEffect(() => {
        if (isPlaying) {
            rafIdRef.current = requestAnimationFrame(tick);
        } else {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        }
        return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
    }, [isPlaying, tick]);


    const togglePlay = () => onPlayPause(!isPlaying);

    const formatTime = (t: number) => {
        if (!Number.isFinite(t)) return "0:00";
        const mins = Math.floor(t / 60);
        const secs = Math.floor(t % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.playerContainer}>
            <div className={styles.waveformContainer}>
                <div ref={containerRef} className={styles.wave} />

                {/* Markers Overlay */}
                {duration > 0 && comments.map((comment) => {
                    const isEngineer = comment.authorId === 'user-1';
                    const baseColor = isEngineer ? '#3b82f6' : '#10b981';
                    const leftPercent = (duration > 0) ? (comment.timestamp / duration) * 100 : 0;
                    if (leftPercent < 0 || leftPercent > 100) return null;
                    const isHighlighted = highlightedCommentId === comment.id;

                    return (
                        <div
                            key={comment.id}
                            className={styles.markerContainer}
                            style={{ left: `${leftPercent}%`, zIndex: isHighlighted ? 50 : 10 }}
                            onClick={(e) => { e.stopPropagation(); onMarkerClick?.(comment.id); }}
                            onMouseEnter={() => onMarkerHover?.(comment.id)}
                            onMouseLeave={() => onMarkerHover?.(null)}
                        >
                            <div className={styles.markerPin} style={{ backgroundColor: baseColor, boxShadow: isHighlighted ? '0 0 10px white' : undefined }} />
                        </div>
                    );
                })}
            </div>

            <div className={styles.controls}>
                <button className={styles.playButton} onClick={togglePlay}>
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                </button>
                <div className={styles.timeDisplay}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>
        </div>
    );
}
