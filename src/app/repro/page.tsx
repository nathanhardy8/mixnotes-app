'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { projectService } from '@/services/projectService';
import { ProjectVersion } from '@/types';

export default function ReproPage() {
    const [status, setStatus] = useState('Idle');
    const [log, setLog] = useState<string[]>([]);
    const supabase = createClient();

    const addLog = (msg: string) => setLog(prev => [...prev, msg]);

    const runRepro = async () => {
        setStatus('Running...');
        setLog([]);
        addLog('Starting Version Management Repro...');

        const user = (await supabase.auth.getUser()).data.user;
        if (!user) {
            addLog('No user logged in');
            return;
        }

        // 1. Create a Test Project
        const projectId = `test-ver-${Date.now()}`;
        // Need a client ID? Let's try to get one.
        const { data: clients } = await supabase.from('clients').select('id').limit(1);
        const clientId = clients?.[0]?.id;

        const { data: project, error } = await supabase.from('projects').insert([{
            title: 'Version Test Project',
            engineer_id: user.id,
            client_id: clientId,
            audio_url: 'http://example.com/base.mp3'
        }]).select().single();

        if (error || !project) {
            addLog('Failed to create project: ' + error?.message);
            return;
        }
        addLog(`Created project ${project.id}`);

        try {
            // 2. Create 3 Versions
            addLog('Creating 3 versions...');
            const v1 = await projectService.createVersion(project.id, 'http://example.com/v1.mp3', user.id);
            const v2 = await projectService.createVersion(project.id, 'http://example.com/v2.mp3', user.id);
            const v3 = await projectService.createVersion(project.id, 'http://example.com/v3.mp3', user.id);

            if (!v1 || !v2 || !v3) {
                addLog('Failed to create versions');
                return;
            }
            addLog(`Created V1(${v1.id}), V2(${v2.id}), V3(${v3.id})`);

            // Fetch ALL versions to see if there was a backfill
            const projectWithVersions = await projectService.getProjectById(project.id);
            const allVersions = projectWithVersions?.versions || [];
            addLog(`Total versions found: ${allVersions.length}`);

            // Filter out v1, v2, v3 ids to find any extras
            const createdIds = new Set([v1.id, v2.id, v3.id]);
            const extraVersions = allVersions.filter(v => !createdIds.has(v.id));
            const extraIds = extraVersions.map(v => v.id);

            // 3. Test Reorder
            // Target Order: V3, V1, V2, ...extras
            addLog('Attempting Reorder: V3, V1, V2, ...extras');
            const newOrderIds = [v3.id, v1.id, v2.id, ...extraIds];

            const reorderSuccess = await projectService.reorderVersions(project.id, newOrderIds);
            if (reorderSuccess) {
                addLog('Reorder API returned success. Verifying...');
                const p = await projectService.getProjectById(project.id);
                const currentOrder = p?.versions?.map(v => v.id) || [];
                addLog(`Current Order: ${JSON.stringify(currentOrder)}`);
                addLog(`Expected Order: ${JSON.stringify(newOrderIds)}`);

                const isMatch = JSON.stringify(currentOrder) === JSON.stringify(newOrderIds);
                if (isMatch) {
                    addLog('✅ Reorder Verified');
                } else {
                    addLog('❌ Reorder Failed Verification');
                }
            } else {
                addLog('❌ Reorder API Failed');
            }

            // 4. Test Delete
            addLog(`Attempting Delete of V2 (${v2.id})...`);
            const deleteSuccess = await projectService.deleteVersion(v2.id);
            if (deleteSuccess) {
                addLog('Delete API returned success. Verifying...');
                const p = await projectService.getProjectById(project.id);
                const foundV2 = p?.versions?.find(v => v.id === v2.id);
                if (!foundV2) {
                    addLog('✅ Delete Verified (V2 is gone)');
                } else {
                    addLog('❌ Delete Failed Validation (V2 still exists)');
                }
            } else {
                addLog('❌ Delete API Failed');
            }

        } catch (e: any) {
            addLog('EXCEPTION: ' + e.message);
            console.error(e);
        } finally {
            // Cleanup
            addLog('Cleaning up project...');
            await projectService.deleteProject(project.id);
            setStatus('Done');
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <h1>Version Management Test</h1>
            <button onClick={runRepro} disabled={status !== 'Idle'}>Run Test</button>
            <pre style={{ marginTop: 20, background: '#eee', padding: 10, maxHeight: 500, overflow: 'auto' }}>
                {log.map((l, i) => <div key={i}>{l}</div>)}
            </pre>
        </div>
    );
}
