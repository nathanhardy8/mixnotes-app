
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
    // We can't query information_schema easily via JS client usually, 
    // but we can try to select one row and see keys.
    const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Keys:', Object.keys(data[0]));
    } else {
        console.log('No data found to infer schema, but query succeeded.');
        // Try strict mock insert to fail on missing columns? No.
    }
}

checkSchema();
