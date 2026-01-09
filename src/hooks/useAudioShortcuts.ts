
import { useEffect } from 'react';

/**
 * Hook to handle global spacebar shortcut for play/pause.
 * 
 * @param isPlaying Current playback state
 * @param onToggle Callback to toggle playback
 */
export const useAudioShortcuts = (isPlaying: boolean, onToggle: (playing: boolean) => void) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                // Check if focus is on an input or contenteditable element
                const activeEl = document.activeElement;
                const isInputActive = activeEl && (
                    activeEl.tagName === 'INPUT' ||
                    activeEl.tagName === 'TEXTAREA' ||
                    activeEl.getAttribute('contenteditable') === 'true'
                );

                if (!isInputActive) {
                    e.preventDefault(); // Prevent scroll
                    onToggle(!isPlaying);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isPlaying, onToggle]);
};
