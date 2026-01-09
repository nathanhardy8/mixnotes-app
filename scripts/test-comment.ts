
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Use service role if available for initial setup/cleanup, but we want to test anon/authenticated user flow essentially.
// However, to simulate the user's issue, we should try with ANON key + maybe a fake user session if possible, 
// OR just simple anon insert if that's what fails.
// Typically 'Network Error' suggests the browser client failed to reach Supabase OR CORS OR RLS policies blocking quietly? 
// No, RLS usually returns 401/403 or empty data, but sometimes generic errors.
// Let's try to just insert a comment with the anon key.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testComment() {
    console.log('Testing comment submission...');

    // We need a project ID. Let's list one.
    const { data: projects, error: projError } = await supabase.from('projects').select('id').limit(1);

    if (projError || !projects || projects.length === 0) {
        console.error('Failed to get a project:', projError);
        return;
    }

    const projectId = projects[0].id;
    console.log(`Using Project ID: ${projectId}`);

    const comment = {
        project_id: projectId,
        content: "Test comment from script",
        timestamp: 123,
        author_type: 'CLIENT',
        author_name: 'Test Script',
        author_id: 'test-script-id'
    };

    const { data, error } = await supabase
        .from('comments')
        .insert([comment])
        .select();

    if (error) {
        console.error('FAILURE: Comment submission failed.');
        console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
        console.log('SUCCESS: Comment submitted.');
        console.log('Data:', data);
    }
}

testComment();
