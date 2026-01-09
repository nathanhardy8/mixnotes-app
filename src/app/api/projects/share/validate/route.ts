
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Fetch Project by Token (Bypassing RLS)
        const { data: project, error } = await supabase
            .from('projects')
            .select('*, client:clients(*), versions:project_versions(*)')
            .eq('share_token', token)
            .single();

        if (error || !project) {
            return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error('Validate Share Token Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
