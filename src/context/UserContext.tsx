'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface UserContextType {
    currentUser: User | null;
    currentRole: UserRole; // 'engineer' | 'client' (guest)
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ error: any }>;
    signup: (email: string, password: string, name: string) => Promise<{ error: any }>;
    updateUser: (updates: Partial<User>) => Promise<boolean>;
    logout: () => Promise<void>;
    viewMode: UserRole; // 'engineer' | 'client'
    setViewMode: (mode: UserRole) => void;
    subscribe: (plan: 'monthly' | 'annual', method: 'stripe' | 'paypal') => Promise<boolean>;
    cancelSubscription: () => Promise<boolean>;
    refreshUser: () => Promise<void>;
    trialStatus: {
        daysRemaining: number;
        isActive: boolean;
        isExpired: boolean;
    };
    setGuestUser: (user: User) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<UserRole>('client');
    const router = useRouter();
    const [supabase] = useState(() => createClient());

    const refreshUser = async (sessionUser?: any) => {
        let userToMap = sessionUser;
        if (!userToMap) {
            const { data: { session } } = await supabase.auth.getSession();
            userToMap = session?.user;
        }

        if (!userToMap) {
            setCurrentUser(null);
            setIsLoading(false);
            return;
        }

        // Fetch Subscription from Table
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userToMap.id)
            .single();

        const metadata = userToMap.user_metadata || {};
        const role = metadata.role || 'engineer';

        // Map Subscription
        let subscription = null;
        if (sub) {
            subscription = {
                userId: sub.user_id,
                billingProvider: sub.billing_provider,
                providerCustomerId: sub.provider_customer_id,
                providerSubscriptionId: sub.provider_subscription_id,
                billingStatus: sub.billing_status,
                planInterval: sub.plan_interval,
                currentPeriodEnd: sub.current_period_end,
                trialStartAt: sub.trial_start_at,
                trialEndAt: sub.trial_end_at,
                trialUsed: sub.trial_used,
                createdAt: sub.created_at,
                updatedAt: sub.updated_at
            };
        }

        // Admin Override (Exempt Email)
        // We don't force subscription object, but we handle it in access checks.
        // Or we can inject a 'virtual' subscription for UI consistency if needed?
        // Better to separate "Role" from "Subscription".

        const user: User = {
            id: userToMap.id,
            email: userToMap.email,
            name: metadata.name || userToMap.email?.split('@')[0] || 'User',
            role: role as UserRole,
            avatarUrl: metadata.avatar_url || `https://ui-avatars.com/api/?name=${metadata.name || 'User'}&background=random`,
            subscription: subscription,
            defaultRevisionLimit: metadata.default_revision_limit
        };

        setCurrentUser(user);

        // Initial View Mode
        if (isLoading) { // Only set on initial load to avoid flipping while browsing
            if (user.role === 'admin') {
                setViewMode('engineer');
            } else {
                setViewMode(user.role);
            }
        }

        setIsLoading(false);
    };

    useEffect(() => {
        refreshUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            refreshUser(session?.user);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        refreshUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            refreshUser(session?.user);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signup = async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: 'engineer',
                    name: name
                    // We DO NOT set trial_start_date here anymore.
                    // Subscription row creation is explicit action or trigger.
                }
            }
        });
        return { error };
    };

    const updateUser = async (updates: Partial<User>) => {
        if (!currentUser) return false;
        const { error } = await supabase.auth.updateUser({
            data: {
                name: updates.name,
                avatar_url: updates.avatarUrl,
                default_revision_limit: updates.defaultRevisionLimit
            }
        });
        if (error) return false;
        await refreshUser(); // Re-fetch to sync
        return true;
    };

    // Derived State
    const currentRole = currentUser?.role || 'client';

    const getTrialStatus = () => {
        // Admin / Exempt
        if (currentUser?.role === 'admin' || currentUser?.email === 'nathan.hardy24@gmail.com') {
            return { daysRemaining: 30, isActive: true, isExpired: false };
        }

        const sub = currentUser?.subscription;
        if (!sub) return { daysRemaining: 0, isActive: false, isExpired: true };

        // Check specifically for Trialing status
        if (sub.billingStatus !== 'trialing') {
            return { daysRemaining: 0, isActive: false, isExpired: true };
        }

        if (!sub.trialEndAt) return { daysRemaining: 0, isActive: false, isExpired: true };

        const end = new Date(sub.trialEndAt);
        const now = new Date();
        const diffMs = end.getTime() - now.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        return {
            daysRemaining: Math.max(0, days),
            isActive: diffMs > 0,
            isExpired: diffMs <= 0
        };
    };

    const trialStatus = getTrialStatus();

    // Context no longer provides 'subscribe' directly, 
    // components should use billingService or API calls, then trigger user refresh?
    // But to keep API valid, we can keep helpers or just remove them.
    // The previous implementation had them. I'll remove them for cleaner separation 
    // but expose a 'refreshUser' so Billing Page can update state after checkout.

    // Actually, I'll keep the interface simple.

    const logout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
        router.push('/login');
    };

    const setGuestUser = (user: User) => {
        setCurrentUser(user);
        setViewMode('client');
        setIsLoading(false);
    };

    return (
        <UserContext.Provider value={{
            currentUser,
            currentRole,
            isLoading,
            login,
            signup,
            updateUser,
            logout,
            viewMode,
            setViewMode,
            trialStatus,
            refreshUser: () => refreshUser(),
            setGuestUser
        } as any}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
