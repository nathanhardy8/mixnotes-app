
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Params are async in Next.js 15+
) {
    const { id } = await params;
    const supabase = await createClient();

    // Verify User is Engineer/Owner
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update Token
    // Postgres gen_random_uuid() is easiest, but we can't easily call it in update without sql function?
    // Actually we can just update the column to default? No.
    // We let Supabase/Postgres handle it or generate in JS.
    // Let's generate in JS for simplicity.
    const newToken = crypto.randomUUID();

    const { error } = await supabase
        .from('projects')
        .update({ share_token: newToken })
        .eq('id', id)
        .eq('engineer_id', user.id); // Ensure ownership

    if (error) {
        return NextResponse.json({ error: 'Failed to reset token' }, { status: 500 });
    }

    return NextResponse.json({ token: newToken });
}
