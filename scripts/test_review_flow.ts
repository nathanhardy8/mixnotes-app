import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = 'http://localhost:3000';

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runTest() {
    console.log('--- STARTING CLIENT REVIEW TEST ---');

    // 1. Create a Test Project (as Engineer)
    console.log('1. Creating Project...');
    // We need an engineer user ID. Let's pick one or create one?
    // Let's assume there is a user.
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users.users.length) {
        console.error('No users found. Please create a user first.');
        return;
    }
    const engineerId = users.users[0].id;

    // Insert directly to bypass RLS/Service logic complexity in script
    const { data: project, error: createError } = await supabase
        .from('projects')
        .insert([{
            title: 'Test Review Project ' + Date.now(),
            engineer_id: engineerId,
            description: 'Automated test project',
            audio_url: 'https://example.com/audio.mp3', // Dummy
            review_enabled: true, // Enable immediately for test
            client_name: 'Test Client',
            client_email: 'client@test.com'
        }])
        .select()
        .single();

    if (createError) throw new Error('Failed to create project: ' + createError.message);
    console.log(`   Project Created: ${project.id}`);

    // 2. Generate Magic Link (via API simulation or Direct DB)
    // We can't call API easily without auth cookie.
    // Let's Insert Link directly to check Client Flow.
    console.log('2. Creating Magic Link...');
    const token = 'test-token-123';
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Ensure public ID
    let publicId = project.review_public_id;
    if (!publicId) {
        publicId = 'prj_test_' + Date.now();
        await supabase.from('projects').update({ review_public_id: publicId }).eq('id', project.id);
    }

    await supabase.from('review_magic_links').insert([{
        project_id: project.id,
        token_hash: tokenHash,
        created_by_user_id: engineerId
    }]);
    console.log(`   Link Created. Token: ${token}, PublicID: ${publicId}`);

    // 3. Test Validation API
    console.log('3. Validating Session via API...');
    const valRes = await fetch(`${baseUrl}/api/review/validate`, {
        method: 'POST',
        body: JSON.stringify({ publicId, token })
    });
    const valData = await valRes.json();
    if (!valData.success) throw new Error('Validation failed: ' + JSON.stringify(valData));
    console.log('   Validation Success:', valData.project.title);

    // 4. Client Comment
    console.log('4. Posting Client Comment...');
    const commentRes = await fetch(`${baseUrl}/api/review/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            publicId,
            token,
            content: 'This sounds great!',
            timestamp: 12.5,
            versionId: null // or version specific
        })
    });
    const commentData = await commentRes.json();
    if (!commentData.success) throw new Error('Comment failed: ' + JSON.stringify(commentData));
    console.log('   Comment Posted:', commentData.comment.content);

    // 5. Client Approval
    console.log('5. Approving Project...');
    // Create a version first to approve? Logic creates v1 automatically?
    // Wait, my createProject service does, but raw Insert above did NOT.
    // So let's insert a version.
    const { data: ver } = await supabase.from('project_versions').insert([{
        project_id: project.id,
        version_number: 1,
        audio_url: 'https://example.com/audio.mp3',
        created_by_user_id: engineerId
    }]).select().single();

    const approveRes = await fetch(`${baseUrl}/api/review/approve`, {
        method: 'POST',
        body: JSON.stringify({
            publicId,
            token,
            action: 'APPROVE',
            versionId: ver.id
        })
    });
    const approveData = await approveRes.json();
    if (!approveData.success) throw new Error('Approval failed: ' + JSON.stringify(approveData));
    console.log('   Project Approved!');

    // 6. Verify State
    const { data: finalProj } = await supabase.from('projects').select('approval_status').eq('id', project.id).single();
    if (finalProj?.approval_status !== 'APPROVED') throw new Error('DB Status not updated');
    console.log('   DB Verified: APPROVED');

    // Clean up
    await supabase.from('projects').delete().eq('id', project.id);
    console.log('--- TEST COMPLETE ---');
}

runTest().catch(console.error);
