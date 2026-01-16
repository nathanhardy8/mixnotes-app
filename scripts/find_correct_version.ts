
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAudio() {
    console.log('Searching for "Feels Right" project...');

    // First get the project to confirm ID (from previous context it is known, but let's be safe or just search by name)
    const { data: projects, error: pError } = await supabase
        .from('projects')
        .select('id, title')
        .eq('title', 'Feels Right');

    if (pError || !projects || projects.length === 0) {
        console.error('Project not found', pError);
        return;
    }

    const project = projects[0];
    console.log(`Found Project: ${project.title} (${project.id})`);

    // Now find the version with original filename 'feelsright(before)'
    // Note: Filename might include extension or not, trying lax search first
    const { data: versions, error: vError } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', project.id);

    if (vError) {
        console.error('Error fetching versions', vError);
        return;
    }

    console.log('Found versions:', versions.map(v => ({
        id: v.id,
        version_number: v.version_number,
        original_filename: v.original_filename,
        audio_url: v.audio_url
    })));

    const target = versions.find(v =>
        v.original_filename && v.original_filename.toLowerCase().includes('feelsright(before)')
    );

    if (target) {
        console.log('\n--- TARGET FOUND ---');
        console.log(`URL: ${target.audio_url}`);
        console.log(`Original Filename: ${target.original_filename}`);
    } else {
        console.log('\n--- TARGET NOT FOUND ---');
        console.log('listing all filenames to help debug:');
        versions.forEach(v => console.log(v.original_filename));
    }
}

findAudio();
