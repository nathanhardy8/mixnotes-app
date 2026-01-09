
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function run() {
    console.log("Starting Delete Logic Verification...");

    // 1. Create a Dummy Client
    // We need a valid Engineer ID. Let's fetch the first user from auth.users (requires service key)
    const { data: { users }, error: uErr } = await supabaseAdmin.auth.admin.listUsers();
    if (uErr || !users || users.length === 0) {
        console.error("No users found to assign client to.");
        return;
    }
    const engineerId = users[0].id;
    console.log(`Using Engineer ID: ${engineerId}`);

    const { data: client, error: cErr } = await supabaseAdmin
        .from('clients')
        .insert({ name: 'TEST_DELETE_ME_' + Date.now(), engineer_id: engineerId })
        .select()
        .single();

    if (cErr) {
        console.error("Failed to create test client:", cErr);
        return;
    }
    console.log(`Created Client: ${client.id} (${client.name})`);

    // 2. Create a Dummy Project attached to Client
    const { data: project, error: pErr } = await supabaseAdmin
        .from('projects')
        .insert({
            title: 'Test Project',
            engineer_id: engineerId,
            client_id: client.id,
            audio_url: 'projects/test-file.mp3'
        })
        .select()
        .single();

    if (pErr) console.error("Failed to create test project:", pErr);
    else console.log(`Created Project: ${project.id}`);

    // 3. EXECUTE DELETION LOGIC (Replicating API Route logic)
    console.log("--- Executing Deletion Logic ---");

    // A. Fetch Projects
    const { data: projects, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('id, audio_url')
        .eq('client_id', client.id);

    if (fetchError) console.error("Error fetching projects:", fetchError);
    console.log(`Found ${projects?.length} projects.`);

    // B. Delete Files (Mock)
    if (projects && projects.length > 0) {
        // ... storage delete logic skip for test to avoid actual bucket errors ...
        // C. Delete Projects
        const pIds = projects.map(p => p.id);
        const { error: delPErr } = await supabaseAdmin.from('projects').delete().in('id', pIds);
        if (delPErr) console.error("Error deleting projects:", delPErr);
        else console.log("Deleted projects successfully.");
    }

    // D. Delete Client
    const { error: delCErr } = await supabaseAdmin.from('clients').delete().eq('id', client.id);
    if (delCErr) {
        console.error("FAIL: Error deleting client:", delCErr);
    } else {
        console.log("SUCCESS: Client deleted.");
    }

    // 4. Verify Gone
    const { data: check } = await supabaseAdmin.from('clients').select('id').eq('id', client.id).single();
    if (check) console.error("FATAL: Client still exists!");
    else console.log("Verification: Client is gone.");
}

run();
