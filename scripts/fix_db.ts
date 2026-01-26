
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    console.log("Attempting to connect to local database 'mixed_db'...");

    // Try to connect with current system user (common for local postgres)
    // If this fails, we might need 'postgres' user
    // Check for DATABASE_URL env var first
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    const client = new Client(connectionString ? {
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    } : {
        host: 'localhost',
        database: 'mixed_db',
        port: 5432,
    });

    try {
        await client.connect();
        console.log("Connected successfully.");

        const sqlPath = path.join(process.cwd(), 'SCHEMA_UPDATES_VISIBILITY.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Running migration from SCHEMA_UPDATES_VISIBILITY.sql...");
        await client.query(sql);
        console.log("Migration executed successfully!");

        // Verify column exists
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='projects' AND column_name='client_version_visibility';
        `);

        if (res.rows.length > 0) {
            console.log("VERIFIED: Column 'client_version_visibility' exists.");
        } else {
            console.error("WARNING: Column verify failed (not found in information_schema).");
        }

    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
