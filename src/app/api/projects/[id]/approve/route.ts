
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    const { versionId, shareToken } = await request.json();

    // We need to use the admin client because we might be a guest user (share token)
    // trying to write to the database which RLS might block, 
    // OR we are an authenticated client but RLS for 'projects' update might be restricted to engineers.
    // For safety and consistent behavior for this specific action, we use admin.
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminAuthClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!projectId || !versionId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let isAuthorized = false;
    let approvedBy = 'Unknown';

    // 1. Check Authorization
    if (shareToken) {
        // Validate Share Token
        const { data: project } = await adminAuthClient
            .from('projects')
            .select('id, share_token')
            .eq('id', projectId)
            .single();

        if (project && project.share_token === shareToken) {
            isAuthorized = true;
            approvedBy = 'Guest Client (Share Link)';
        }
    } else {
        // Validate Session
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Check if user has access (Engineer or Client)
            // Ideally we check RLS or queried permissions, but for now existence of user 
            // and checking if they are the engineer or assigned client would be better.
            // Simplified: if they are logged in, we let them try, but strictly we should check relation.
            // Let's verify they are related to the project.
            const { data: project } = await adminAuthClient
                .from('projects')
                .select('engineer_id, client_id, client_ids')
                .eq('id', projectId)
                .single();

            if (project) {
                if (project.engineer_id === user.id) {
                    isAuthorized = true;
                    approvedBy = 'Engineer';
                } else if (project.client_id === user.id || (project.client_ids && project.client_ids.includes(user.id))) {
                    isAuthorized = true;
                    approvedBy = 'Client';
                }
            }
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Perform Approval
    // Update Project
    const { error: updateError } = await adminAuthClient
        .from('projects')
        .update({
            approval_status: 'APPROVED',
            approved_version_id: versionId,
            approved_at: new Date().toISOString(),
            approved_by: approvedBy,
            last_client_activity_at: new Date().toISOString()
        })
        .eq('id', projectId);

    if (updateError) {
        console.error("Approval Error", updateError);
        return NextResponse.json({ error: 'Failed to approve project' }, { status: 500 });
    }

    // Mark Version as Approved
    await adminAuthClient
        .from('project_versions')
        .update({ is_approved: true })
        .eq('id', versionId);

    // 3. Send Notifications
    try {
        const { data: fullProject } = await adminAuthClient
            .from('projects')
            .select('title, engineer_id, client_id, clients(name)')
            .eq('id', projectId)
            .single();

        if (fullProject) {
            const { data: { user: engineer } } = await adminAuthClient.auth.admin.getUserById(fullProject.engineer_id);
            if (engineer?.email) {
                const { emailService } = await import('@/lib/email');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const clientName = (fullProject as any).clients?.name || approvedBy;
                await emailService.sendApprovalNotification(engineer.email, clientName, fullProject.title);
            }
        }
    } catch (emailErr) {
        console.error("Failed to send approval email", emailErr);
    }

    return NextResponse.json({ success: true, status: 'APPROVED' });
}
