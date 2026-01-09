import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const body = await request.json();
    const { title, description, audioUrl, engineerId, clientId, isLocked, sizeBytes, revisionLimit } = body;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Enforce Client Assignment
    if (!clientId) {
        return NextResponse.json(
            { error: 'Projects must be created under a client folder.' },
            { status: 400 }
        );
    }

    // 2. Validate Client Ownership (or Admin)
    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin) {
        // Check if client belongs to user
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('id, user_id')
            .eq('id', clientId)
            .single();

        if (clientError || !client) {
            return NextResponse.json({ error: 'Client folder not found.' }, { status: 404 });
        }

        if (client.user_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized access to client folder.' }, { status: 403 });
        }
    }

    // 3. Create Project
    const newProject = {
        title,
        description,
        audio_url: audioUrl,
        engineer_id: user.id, // Enforce current user as engineer
        client_id: clientId,
        is_locked: isLocked ?? false, // Default to unlocked if not specified? Or true? "Download Locked" default is safer?
        // Let's stick to existing default `true` if `isLocked` is passed, or maybe `true` is safer default.
        // Wait, if no price, locking by default is annoying.
        // Let's default to `false` (unlocked) since "payment" is the main reason to lock.
        // Unless user explicitly locks it.
        price: 0,
        size_bytes: sizeBytes ?? 0,
        revision_limit: revisionLimit // undefined/null = unlimited
    };

    const { data: projectData, error: insertError } = await supabase
        .from('projects')
        .insert([newProject])
        .select()
        .single();

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 4. Create Initial Version
    if (audioUrl) {
        await supabase.from('project_versions').insert([{
            project_id: projectData.id,
            version_number: 1,
            audio_url: audioUrl,
            created_by_user_id: user.id
        }]);
    }

    return NextResponse.json(projectData);
}
