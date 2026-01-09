
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Correct Next.js 15+ param handling
) {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // 1. Check Auth (Producer only)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!projectId) {
        return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // 2. Verify Project Ownership
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, review_public_id')
        .eq('id', projectId)
        .eq('engineer_id', user.id)
        .single();

    if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    // 3. Check for existing Active Link
    const { data: existingLink } = await supabase
        .from('review_magic_links')
        .select('expires_at, created_at')
        .eq('project_id', projectId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (existingLink) {
        // We CANNOT return the token because we don't store it. 
        // We return status so UI knows it exists.
        return NextResponse.json({
            success: true,
            linkExists: true,
            publicId: project.review_public_id,
            expiresAt: existingLink.expires_at,
            // token: undefined // Hidden
        });
    }

    // 4. Generate New Token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 5. Ensure Public ID Exists
    let publicId = project.review_public_id;
    if (!publicId) {
        publicId = `prj_${crypto.randomBytes(4).toString('hex')}`;
        await supabase
            .from('projects')
            .update({ review_public_id: publicId, review_enabled: true })
            .eq('id', projectId);
    }

    // 6. Store Link
    const { error: insertError } = await supabase
        .from('review_magic_links')
        .insert([{
            project_id: projectId,
            token_hash: tokenHash,
            created_by_user_id: user.id
        }]);

    if (insertError) {
        return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
    }

    // 7. Return URL (ONLY TIME TOKEN EXPOSED)
    return NextResponse.json({
        success: true,
        linkExists: true,
        isNew: true,
        token: token,
        publicId: publicId
    });
}
