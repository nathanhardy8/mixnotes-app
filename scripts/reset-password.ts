import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
const NEW_PASSWORD = 'password123';

async function resetPassword() {
    console.log(`Looking up user: ${TARGET_EMAIL}...`);

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

    console.log(`Found user ${user.id}. Resetting password...`);

    const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: NEW_PASSWORD }
    );

    if (updateError) {
        console.error('Error updating password:', updateError);
        process.exit(1);
    }

    console.log(`Success! Password for ${TARGET_EMAIL} has been reset to: ${NEW_PASSWORD}`);
}

resetPassword();
