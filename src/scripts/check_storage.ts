import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
    console.log('Checking Storage Permissions...');
    const fileName = `check-perm-${Date.now()}.txt`;
    const { data, error } = await supabase.storage
        .from('projects')
        .upload(fileName, 'Test Permission');

    if (error) {
        console.error('❌ Storage Upload Failed:', error.message);
        console.error('Details:', error);
    } else {
        console.log('✅ Storage Upload Success:', data.path);
        // Cleanup
        await supabase.storage.from('projects').remove([fileName]);
    }
}

checkStorage();
