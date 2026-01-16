
import dotenv from 'dotenv';
import path from 'path';

// Load env before importing supabase utils (if they rely on process.env)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrate() {
    console.log('Starting migration...');

    // 1. Get all projects
    const { data: projects, error: pError } = await supabase
        .from('projects')
        .select('*');

    if (pError || !projects) {
        console.error('Failed to fetch projects', pError);
        return;
    }

    console.log(`Found ${projects.length} projects.`);

    for (const project of projects) {
        console.log(`Processing Project: ${project.title} (${project.id})`);

        // Check versions
        let { data: versions } = await supabase
            .from('project_versions')
            .select('*')
            .eq('project_id', project.id)
            .order('version_number', { ascending: true });

        let firstVersionId = versions && versions.length > 0 ? versions[0].id : null;

        if (!firstVersionId) {
            console.log(`  No versions found. Creating Version 1...`);
            // Create V1 using project's current audioUrl
            const { data: newVer, error: vError } = await supabase
                .from('project_versions')
                .insert([{
                    project_id: project.id,
                    version_number: 1,
                    audio_url: project.audio_url, // Use main project audio
                    created_by_user_id: project.engineer_id,
                    created_at: project.created_at // Backdate to project creation
                }])
                .select()
                .single();

            if (vError || !newVer) {
                console.error(`  Failed to create version for project ${project.id}`, vError);
                continue;
            }
            firstVersionId = newVer.id;
        }

        console.log(`  Target Version ID: ${firstVersionId}`);

        // Update comments with NULL project_version_id
        const { data: commentsToUpdate, error: cError } = await supabase
            .from('comments')
            .select('id')
            .eq('project_id', project.id)
            .is('project_version_id', null);

        if (cError) {
            console.error(`  Error fetching comments`, cError);
            continue;
        }

        if (commentsToUpdate && commentsToUpdate.length > 0) {
            console.log(`  Updating ${commentsToUpdate.length} comments to use version ${firstVersionId}...`);
            const { error: uError } = await supabase
                .from('comments')
                .update({ project_version_id: firstVersionId })
                .eq('project_id', project.id)
                .is('project_version_id', null);

            if (uError) {
                console.error("  Update failed", uError);
            } else {
                console.log("  Success.");
            }
        } else {
            console.log("  No comments needing update.");
        }
    }

    console.log('Migration complete.');
}

migrate();
