import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const TARGET_EMAIL = 'nathan.hardy24@gmail.com';

export function generateToken(size = 32): string {
    return randomBytes(size).toString('hex');
}

export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

async function generateLink() {
    console.log(`Generating reset link for: ${TARGET_EMAIL}...`);

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        process.exit(1);
    }

    const user = users.find(u => u.email === TARGET_EMAIL);

    if (!user) {
        console.error(`User with email ${TARGET_EMAIL} not found.`);
        process.exit(1);
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Invalidate old tokens
    await supabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('used_at', null);

    // Insert new token
    const { error: insertError } = await supabase
        .from('password_reset_tokens')
        .insert({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: expiresAt.toISOString(),
        });

    if (insertError) {
        console.error('Error saving token to DB:', insertError);
        console.error('Did you run the migration in SCHEMA_UPDATES.sql?');
        process.exit(1);
    }

    const resetLink = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(TARGET_EMAIL)}`;

    console.log('\nSUCCESS! Here is your manual reset link:');
    console.log(resetLink);
    console.log('\n(This link expires in 1 hour)');
}

generateLink();
