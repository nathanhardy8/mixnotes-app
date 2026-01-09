'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { useUser } from '@/context/UserContext';
import { usePathname, useRouter } from 'next/navigation';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { viewMode, currentUser, trialStatus } = useUser();
    const pathname = usePathname();
    const router = useRouter();

    // Logic: Show sidebar if user is engineer AND in engineer view mode AND not in client review pages AND not on landing page
    const showSidebar = (viewMode === 'engineer' || viewMode === 'admin') && pathname !== '/login' && pathname !== '/' && !pathname?.startsWith('/review');

    React.useEffect(() => {
        // Enforce Billing / Paywall Access
        if (currentUser) {
            // Use centralized access check
            // Note: We dynamically import or use the service logic
            const { billingService } = require('@/services/billingService');
            const access = billingService.checkAccess(currentUser);

            if (!access.allowed && access.reason !== 'inactive') {
                // If denied, redirect to billing
                // Allow /login and /billing
                if (pathname !== '/dashboard/billing' && pathname !== '/login') {
                    router.push('/dashboard/billing');
                }
            } else if (!access.allowed && access.reason === 'inactive') {
                // Explicitly inactive/expired
                if (pathname !== '/dashboard/billing' && pathname !== '/login') {
                    router.push('/dashboard/billing');
                }
            }
        }
    }, [currentUser, pathname, router]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {showSidebar && <Sidebar />}

            <main style={{
                flex: 1,
                background: '#f1f5f9', // Global background color
                position: 'relative'
            }}>
                {children}
            </main>
        </div>
    );
}
