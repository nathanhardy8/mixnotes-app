import { NextRequest, NextResponse } from 'next/server';

import { generateToken, hashToken } from '@/lib/tokens';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        // 1. Generic Validation
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ message: 'Invalid email' }, { status: 400 });
        }

        // 2. Strict Rate Limiting (Mock implementation - in prod use Redis/KV)
        // Check per-IP or per-email limits here. 
        // Failing silently or with generic error if limited.

        // 3. Check if user exists (Supabase Admin)
        // We use the service role key to look up users because the client key cannot list users.
        // However, we need a way to find the user ID by email.

        // Since we don't have the Service Role client easily accessible in this specific file context 
        // (existing supabase.ts uses public key), we need to create a service role client locally 
        // OR import the one from `utils/supabase/server` if it supports service role.

        // Let's assume for this specific sensitive operation we need admin access.
        // We'll quick-instantiate a service client here if not available globally.
        // NOTE: In a real app avoiding duplication is better.

        const adminClient = await createAdminClient();
        const { data: { users }, error } = await adminClient.auth.admin.listUsers();

        // NOTE: listUsers is inefficient for looking up one user by email in large DBs, 
        // but Supabase Auth doesn't expose "getUserByEmail" purely via Admin API without ID easily 
        // unless you use `getUserById`. 
        // Actually, normally you just try to initiate a reset flow.

        // Better approach: We should trust our `password_reset_tokens` flow.
        // We need the User ID to insert into our table.

        const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (user) {
            // 4. Generate Token
            const token = generateToken();
            const tokenHash = hashToken(token);
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

            // 5. Save to DB (Service Role needed for RLS bypass if we set RLS to "no public access")
            // We use the adminClient for database operations on this protected table.

            // First, invalidate old tokens
            await adminClient
                .from('password_reset_tokens')
                .update({ used_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .is('used_at', null);

            // Insert new token
            const { error: insertError } = await adminClient
                .from('password_reset_tokens')
                .insert({
                    user_id: user.id,
                    token_hash: tokenHash,
                    expires_at: expiresAt.toISOString(),
                });

            if (insertError) {
                console.error('Error saving token:', insertError);
                // Return generic success to avoid leaking info
                return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
            }

            // 6. Send Email
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
            const resetLink = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

            await emailService.sendEmail({
                to: email,
                subject: 'Reset your Mixnote password',
                text: `Use this link to reset your password: ${resetLink}\n\nThis link expires in 1 hour.`,
                html: `<p>Click here to reset your password: <a href="${resetLink}">Reset Password</a></p><p>This link expires in 1 hour.</p>`
            });
        }

        // 7. Generic Response
        return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// Helper to create admin client quickly
// Move this to a shared lib if reused often
import { createClient } from '@supabase/supabase-js';

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
