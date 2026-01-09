import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
    const supabase = await createClient();

    // 1. Check Auth (Producer only)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await request.json();

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

    // 3. Generate Token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 4. Ensure Public ID Exists (if not, create one)
    let publicId = project.review_public_id;
    if (!publicId) {
        publicId = `prj_${crypto.randomBytes(4).toString('hex')}`;
        await supabase
            .from('projects')
            .update({ review_public_id: publicId, review_enabled: true })
            .eq('id', projectId);
    }

    // 5. Revoke old links? (Optional policy: One active link at a time? Or just add new one?)
    // Decision: Expire old active links for hygiene, or just allow multiple.
    // MVP: Let's just revoke open ones to keep it clean, or just add new. 
    // Let's Add New.

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

    // 7. Return URL
    // Construct simplified URL. origin + /review/ + publicId + ?t=token
    // client must handle constructing full URL with window.location.origin
    return NextResponse.json({
        success: true,
        token: token,
        publicId: publicId
    });
}
