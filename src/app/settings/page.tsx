'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader, AlertTriangle } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import styles from './styles.module.css';

export default function SettingsPage() {
    const { currentUser, updateUser } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // --- State ---

    // Profile
    const [name, setName] = useState('');

    // Password
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Revisions
    const [isUnlimitedRevisions, setIsUnlimitedRevisions] = useState(true);
    const [revisionLimit, setRevisionLimit] = useState(3);

    // Preferences
    const [timezone, setTimezone] = useState('UTC');

    // --- Init ---
    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '');

            // Revisions
            if (currentUser.defaultRevisionLimit === null || currentUser.defaultRevisionLimit === undefined) {
                setIsUnlimitedRevisions(true);
                setRevisionLimit(3); // Default placeholder
            } else {
                setIsUnlimitedRevisions(false);
                setRevisionLimit(currentUser.defaultRevisionLimit);
            }

            // Timezone (Using mock logic as in previous code comment)
            // setTimezone(currentUser.timezone || 'UTC'); 

            // Timezone (Using mock logic as in previous code comment)
            // setTimezone(currentUser.timezone || 'UTC'); 
        }
    }, [currentUser]);

    // --- Dirty Detection ---
    const isDirty = useMemo(() => {
        if (!currentUser) return false;

        if (name !== (currentUser.name || '')) return true;

        // Password fields dirty if any are typed
        if (currentPassword || newPassword || confirmPassword) return true;

        // Revisions
        const currentLimit = isUnlimitedRevisions ? null : revisionLimit;
        // Strict null check vs undefined/null in currentUser
        const serverLimit = currentUser.defaultRevisionLimit === undefined ? null : currentUser.defaultRevisionLimit;
        if (currentLimit !== serverLimit) return true;

        // Timezone (Mock check vs 'UTC' default)
        if (timezone !== 'UTC') return true;

        // Timezone (Mock check vs 'UTC' default)
        if (timezone !== 'UTC') return true;

        return false;
    }, [currentUser, name, currentPassword, newPassword, confirmPassword, isUnlimitedRevisions, revisionLimit, timezone]);

    // --- Handlers ---

    const handleGlobalSave = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setToast(null);

        try {
            // 1. Validate Password if changed
            if (newPassword || confirmPassword) {
                if (!currentPassword) throw new Error("Current password is required to set a new one.");
                if (newPassword !== confirmPassword) throw new Error("New passwords do not match.");
                if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
            }

            // 2. Prepare Updates
            const updates: any = {};
            let hasUpdates = false;

            if (name !== currentUser.name) {
                updates.name = name;
                hasUpdates = true;
            }

            const newRevisionValue = isUnlimitedRevisions ? null : revisionLimit;
            if (newRevisionValue !== currentUser.defaultRevisionLimit) {
                updates.defaultRevisionLimit = newRevisionValue;
                hasUpdates = true;
            }

            // Timezone would go here if real
            // if (timezone !== currentUser.timezone) updates.timezone = timezone;

            // Timezone would go here if real
            // if (timezone !== currentUser.timezone) updates.timezone = timezone;

            // 3. Update User Data
            if (hasUpdates) {
                const success = await updateUser(updates);
                if (!success) throw new Error("Failed to update profile settings.");
            }

            // 4. Update Password (Mocked mostly as per previous code)
            if (newPassword) {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000));
                // In real app: await authService.updatePassword(currentPassword, newPassword);
            }

            setToast({ message: 'Settings saved.', type: 'success' });

            // Clear password fields on success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

        } catch (err: any) {
            setToast({ message: err.message || 'Failed to save settings.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) return null;

    return (
        <div className={styles.container}>
            <Link href="/dashboard" className={styles.backLink}>
                <ArrowLeft size={16} /> Back to Clients
            </Link>

            <header className={styles.header}>
                <h1 className={styles.title}>Account Settings</h1>
            </header>

            {/* Toast Feedback */}
            {toast && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    borderRadius: '8px',
                    background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: toast.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    {toast.type === 'success' ? <div style={{ fontSize: '1.2em' }}>✓</div> : <AlertTriangle size={20} />}
                    {toast.message}
                </div>
            )}

            {/* Profile Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Profile Details</h2>
                <div className={styles.formGrid}>
                    <div className={styles.field}>
                        <label className={styles.label}>Display Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={styles.input}
                            required
                        />
                    </div>
                </div>
            </section>

            {/* Password Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Change Password</h2>
                <div className={styles.formGrid}>
                    <div className={styles.field}>
                        <label className={styles.label}>Current Password</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={styles.input}
                            placeholder="Leave blank to keep unchanged"
                        />
                    </div>
                    <div className={styles.row}>
                        <div className={`${styles.field} ${styles.half}`}>
                            <label className={styles.label}>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                        <div className={`${styles.field} ${styles.half}`}>
                            <label className={styles.label}>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Default Revisions Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Default Revisions</h2>
                <div className={styles.formGrid}>
                    <div className={styles.field}>
                        <label className={styles.label}>Default Revisions Included</label>
                        <div className={styles.row} style={{ alignItems: 'center', marginBottom: '8px' }}>
                            <input
                                type="checkbox"
                                checked={isUnlimitedRevisions}
                                onChange={(e) => setIsUnlimitedRevisions(e.target.checked)}
                                id="unlimited-check"
                                style={{ marginRight: '8px' }}
                            />
                            <label htmlFor="unlimited-check" style={{ cursor: 'pointer' }}>Unlimited</label>
                        </div>
                        {!isUnlimitedRevisions && (
                            <div>
                                <input
                                    type="number"
                                    value={revisionLimit}
                                    onChange={(e) => setRevisionLimit(Math.max(1, parseInt(e.target.value) || 0))}
                                    className={styles.input}
                                    min="1"
                                />
                                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                                    New projects will start with this many included revisions.
                                </p>
                            </div>
                        )}
                        {isUnlimitedRevisions && (
                            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                                New projects will have unlimited revisions by default.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* Preferences Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Preferences</h2>
                <div className={styles.formGrid}>
                    <div className={styles.field}>
                        <label className={styles.label}>Timezone</label>
                        <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className={styles.input}
                        >
                            <option value="UTC">UTC (Universal Time)</option>
                            <option value="EST">EST (Eastern Standard Time)</option>
                            <option value="CST">CST (Central Standard Time)</option>
                            <option value="MST">MST (Mountain Standard Time)</option>
                            <option value="PST">PST (Pacific Standard Time)</option>
                            <option value="GMT">GMT (Greenwich Mean Time)</option>
                            <option value="CET">CET (Central European Time)</option>
                        </select>
                    </div>
                </div>
            </section>



            {/* Static Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button
                    onClick={handleGlobalSave}
                    className={styles.saveBtn}
                    disabled={!isDirty || isLoading}
                    style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    {isLoading ? <Loader className="spin" size={18} /> : <Save size={18} />}
                    Save Changes
                </button>
            </div>
        </div >
    );
}
