import React, { useEffect } from 'react';
import styles from './Toast.module.css';
import { Check, XCircle } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error';
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={`${styles.container} ${type === 'success' ? styles.success : styles.error}`}>
            {type === 'success' ? <Check size={18} /> : <XCircle size={18} />}
            {message}
        </div>
    );
}
