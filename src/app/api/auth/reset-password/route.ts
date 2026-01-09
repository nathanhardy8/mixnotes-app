import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateToken } from '@/lib/tokens';
import { hashToken } from '@/lib/tokens';

// Reusing the admin helper concept
async function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

export async function POST(request: NextRequest) {
    try {
        const { token, email, password } = await request.json();

        if (!token || !email || !password) {
            return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const adminClient = await createAdminClient();

        // 1. Find the user ID by email (to lookup tokens efficiently if we indexed user_id)
        // Or simpler: Look up token by hash directly if it's unique enough (it is).
        // But we want to ensure it belongs to the claimed email for security (binding).

        // Get user first to verify email binding
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (!user) {
            return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
        }

        // 2. Lookup Token
        const tokenHash = hashToken(token);

        const { data: tokenRecord, error } = await adminClient
            .from('password_reset_tokens')
            .select('*')
            .eq('token_hash', tokenHash)
            .eq('user_id', user.id) // Enforce user binding
            .single();

        if (error || !tokenRecord) {
            return NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 });
        }

        // 3. Verify Constraints
        if (tokenRecord.used_at) {
            return NextResponse.json({ message: 'Token already used' }, { status: 400 });
        }

        if (new Date(tokenRecord.expires_at) < new Date()) {
            return NextResponse.json({ message: 'Token expired' }, { status: 400 });
        }

        // 4. Update Password
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
            user.id,
            { password: password }
        );

        if (updateError) {
            console.error('Password update failed:', updateError);
            return NextResponse.json({ message: 'Failed to update password' }, { status: 500 });
        }

        // 5. Mark Token Used
        await adminClient
            .from('password_reset_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('id', tokenRecord.id);

        return NextResponse.json({ message: 'Password reset successful' });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
