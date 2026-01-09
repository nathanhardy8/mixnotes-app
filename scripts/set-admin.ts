import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    console.error('Make sure they are set in your .env.local file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const TARGET_EMAIL = 'nathan.hardy24@gmail.com';

async function setAdminRole() {
    console.log(`Looking up user: ${TARGET_EMAIL}...`);

    // 1. List users to find the ID (admin only)
    // note: listUsers defaults to page 1, distinct users
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        process.exit(1);
    }

    const user = users.find(u => u.email === TARGET_EMAIL);

    if (!user) {
        console.error(`User with email ${TARGET_EMAIL} not found.`);
        console.log('Available users:', users.map(u => u.email));
        process.exit(1);
    }

    console.log(`Found user ${user.id}. Current metadata:`, user.user_metadata);

    // 2. Update user metadata
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { user_metadata: { ...user.user_metadata, role: 'admin' } }
    );

    if (updateError) {
        console.error('Error updating user role:', updateError);
        process.exit(1);
    }

    console.log('Success! User role set to admin.');
    console.log('New metadata:', updatedUser.user.user_metadata);
}

setAdminRole();
