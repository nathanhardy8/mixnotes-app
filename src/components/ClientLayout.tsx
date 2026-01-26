'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { useUser } from '@/context/UserContext';
import { usePathname, useRouter } from 'next/navigation';
import { billingService } from '@/services/billingService';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { viewMode, currentUser, trialStatus } = useUser();
    const pathname = usePathname();
    const router = useRouter();

    // Logic: Show sidebar if user is engineer AND in engineer view mode AND not in client review pages AND not on landing page
    const showSidebar = (viewMode === 'engineer' || viewMode === 'admin') && pathname !== '/login' && pathname !== '/' && !pathname?.startsWith('/review');

    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

    React.useEffect(() => {
        // Enforce Billing / Paywall Access
        if (currentUser) {
            // Use centralized access check
            // Note: We dynamically import or use the service logic
            // Use centralized access check
            // Note: We dynamically import or use the service logic
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

        // Close sidebar on path change
        setIsMobileSidebarOpen(false);
    }, [currentUser, pathname, router]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
            {/* Mobile Header (Visible only on mobile) */}
            {showSidebar && (
                <div style={{
                    display: 'none', // Overridden by media query below
                    padding: '1rem',
                    background: '#1e293b',
                    borderBottom: '1px solid #334155',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }} className="mobile-header">
                    <img
                        src="/mixnotes-logo.png"
                        alt="MixNotes"
                        width={120}
                        height={34}
                        style={{ objectFit: 'contain' }}
                    />
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <style jsx>{`
                        @media (max-width: 768px) {
                            .mobile-header {
                                display: flex !important;
                            }
                        }
                    `}</style>
                </div>
            )}

            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                {showSidebar && <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />}

                <main style={{
                    flex: 1,
                    background: '#f1f5f9', // Global background color
                    position: 'relative',
                    width: '100%' // Ensure full width
                }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
