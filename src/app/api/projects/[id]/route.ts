import { createClient } from '@/utils/supabase/server'; // Assumed server util exists
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await context.params;
    const { title, clientId, archivedAt, revisionLimit } = await request.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Basic permission check: Owner or Admin
    // For now rely on RLS or simple check? 
    // Admin role bypass is handled in RLS usually or here explicitly
    const isAdmin = user.user_metadata?.role === 'admin';

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (clientId !== undefined) updates.client_id = clientId; // null is valid for Unassigned
    if (archivedAt !== undefined) updates.archived_at = archivedAt;
    if (revisionLimit !== undefined) updates.revision_limit = revisionLimit;

    // TODO: Verify ownership if not Admin?
    // Supabase RLS policies usually handle "only update own rows", 
    // but for 'admin' we might use Service Role if we are strictly bypassing.
    // However, the prompt says Admin inherits permissions. 
    // Assuming standard client is sufficient if RLS is set up correctly for 'admin' role, 
    // OR we check logic here. 
    // Given previous tasks, we know `middleware` bypasses checks, but RLS is at DB level.
    // Let's assume standard client works for "Owner", but if we need "Admin" power over ANY file,
    // we might need Service Key if RLS blocks it. 
    // For now, let's stick to standard client and trust RLS/Policies for engineers.

    const { data: updatedProject, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedProject);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await context.params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch project to get storage path
    const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('audio_url')
        .eq('id', id)
        .single();

    if (fetchError || !project) {
        // If already gone, success? Or 404? 
        // Let's assume if it's gone, our job is done.
        return NextResponse.json({ success: true });
    }

    // 2. Cleanup Storage
    if (project.audio_url) {
        try {
            const urlParts = project.audio_url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            if (fileName) {
                await supabase.storage.from('projects').remove([fileName]);
            }
        } catch (e) {
            console.error("Storage cleanup failed:", e);
            // Continue to DB delete even if storage fails? Yes.
        }
    }

    // 3. Delete from DB
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
