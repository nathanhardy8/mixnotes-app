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

export default function Sidebar() {
    const { currentUser, currentRole, logout } = useUser();
    const pathname = usePathname();

    if (currentRole !== 'engineer' && currentRole !== 'admin') return null;

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <img
                    src="/mixnotes-logo.png"
                    alt="MixNotes"
                    width={160}
                    height={46}
                    style={{ objectFit: 'contain' }}
                />
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
                        // and project paths /project/...
                        // But MUST NOT match the above specific sibling routes.
                        const isSiblingRoute = pathname.startsWith('/dashboard/billing') ||
                            pathname.startsWith('/dashboard/comments') ||
                            pathname.startsWith('/dashboard/projects');

                        isActive = !isSiblingRoute && (
                            pathname === '/dashboard' ||
                            pathname.startsWith('/dashboard/client') ||
                            pathname.startsWith('/project') ||
                            pathname.startsWith('/dashboard/folder') // If that exists
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
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
    );
}
