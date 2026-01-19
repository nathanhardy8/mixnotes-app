'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
    { label: 'Clients', href: '/dashboard' },
    { label: 'Projects', href: '/dashboard/projects' },
    { label: 'Inbox', href: '/dashboard/comments' },
    { label: 'Billing', href: '/dashboard/billing' },
    { label: 'Settings', href: '/settings' },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
    const { currentUser, currentRole, logout } = useUser();
    const pathname = usePathname();

    if (currentRole !== 'engineer' && currentRole !== 'admin') return null;

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && onClose && (
                <div
                    className={styles.backdrop}
                    onClick={onClose}
                    style={{ display: 'none' }} // Visible only via media query logic in CSS if we used purely CSS, but here we need JS control.
                // Actually, better to control conditionally in rendering or use a class.
                />
            )}

            {/* We'll use a class to toggle visibility on mobile, but 'isOpen' prop drives it */}
            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                <div className={styles.logo}>
                    <img
                        src="/mixnotes-logo.png"
                        alt="MixNotes"
                        width={160}
                        height={46}
                        style={{ objectFit: 'contain' }}
                    />
                    <button className={styles.closeBtn} onClick={onClose}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <nav className={styles.nav}>
                    {NAV_ITEMS.filter(item => {
                        // if (currentRole === 'admin' && item.label === 'Billing') return false; 
                        // Requirement: Admins should see Billing page (as Exempt status)

                        return true;
                    }).map(item => {
                        let isActive = false;

                        if (item.href === '/settings') {
                            isActive = pathname.startsWith('/settings');
                        } else if (item.href === '/dashboard/billing') {
                            isActive = pathname.startsWith('/dashboard/billing');
                        } else if (item.href === '/dashboard/comments') {
                            isActive = pathname.startsWith('/dashboard/comments');
                        } else if (item.href === '/dashboard/projects') {
                            isActive = pathname.startsWith('/dashboard/projects');
                        } else if (item.href === '/dashboard') {
                            // "Clients" (Root) matches exactly /dashboard, 
                            // sub-client paths /dashboard/client/..., 
                            // and project paths /projects/...
                            // But MUST NOT match the above specific sibling routes.
                            const isSiblingRoute = pathname.startsWith('/dashboard/billing') ||
                                pathname.startsWith('/dashboard/comments') ||
                                pathname.startsWith('/dashboard/projects');

                            isActive = !isSiblingRoute && (
                                pathname === '/dashboard' ||
                                pathname.startsWith('/dashboard/client') ||
                                pathname.startsWith('/projects') ||
                                pathname.startsWith('/dashboard/folder') // If that exists
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                onClick={onClose} // Close sidebar on nav
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.userSection}>
                    <div className={styles.userInfo}>
                        <img src={currentUser?.avatarUrl} alt="Avatar" className={styles.avatar} />
                        <div>
                            <div className={styles.userName}>{currentUser?.name}</div>
                            <div className={styles.userRole}>{currentRole}</div>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        style={{
                            marginTop: '0.5rem',
                            width: '100%',
                            border: 'none',
                            background: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            textAlign: 'left',
                            padding: 0,
                            fontSize: '0.85rem'
                        }}
                    >
                        Log Out
                    </button>
                </div>
            </aside>

            {/* Render backdrop outside aside to avoid z-index issues if possible, or use the one above */}
            {isOpen && onClose && (
                <div className={styles.backdrop} onClick={onClose} style={{ display: 'block' }}>
                    <style jsx>{`
                        @media (min-width: 769px) {
                            .${styles.backdrop} {
                                display: none !important;
                            }
                        }
                     `}</style>
                </div>
            )}
        </>
    );
}
