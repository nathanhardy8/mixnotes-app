
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

const TARGET_EMAIL = process.argv[2];

if (!TARGET_EMAIL) {
    console.error('Please provide an email address as an argument.');
    console.log('Usage: npx tsx scripts/set-admin-role.ts user@example.com');
    process.exit(1);
}

async function setAdminRole() {
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

    console.log(`Found user ${user.id}. Current role: ${user.user_metadata?.role || 'none'}`);
    console.log('Updating role to ADMIN...');

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { user_metadata: { ...user.user_metadata, role: 'admin' } }
    );

    if (updateError) {
        console.error('Error updating user:', updateError);
        process.exit(1);
    }

    console.log('SUCCESS! User role updated to assigned "admin".');
    console.log('The user should now have full Engineer privileges and bypass subscription checks.');
}

setAdminRole();
