'use client';

import React, { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { currentUser, currentRole, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!currentUser) {
                router.push('/login');
            } else if (currentRole !== 'engineer' && currentRole !== 'admin') {
                // Logged in but not engineer? Restrict.
            }
        }
    }, [currentUser, currentRole, isLoading, router]);

    if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;

    if (!currentUser || (currentRole !== 'engineer' && currentRole !== 'admin')) {
        return null; // Will redirect
    }

    return (
        <>
            {children}
        </>
    );
}
