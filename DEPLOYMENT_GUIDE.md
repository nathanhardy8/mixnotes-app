# Deployment Guide

This guide covers how to push your changes to GitHub and what to run on your Production environment.

## 1. Pushing to GitHub

Open your terminal in the project directory (`/Users/nathanhardy/Documents/Antigravity`) and run:

```bash
# 1. Add all changes
git add .

# 2. Commit changes
git commit -m "Fix: Version sync, SQL performance, and bulk deletion"

# 3. Push to main branch (or your feature branch)
git push origin main
```

If you are connected to Vercel, this push will automatically trigger a new deployment.

## 2. Production Database Updates

Since we made manual changes to your local/development database using SQL scripts, you need to apply these changes to your **Production** Supabase database as well.

1.  Log in to your Supabase Dashboard.
2.  Select your **Production** project.
3.  Go into the **SQL Editor**.
4.  Open the file `DEPLOYMENT_MIGRATION.sql` from your project folder.
5.  Copy the entire content.
6.  Paste it into the SQL Editor and click **Run**.

This script handles:
*   **Realtime**: Enabling Guest access for syncing.
*   **Deep Access**: Ensuring Engineers can access their data with strict security enabled.
*   **Deletion Fixes**: Ensuring projects delete cleanly without returning.
*   **Performance**: Adding indexes to make the site fast.

## 3. Environment Variables (Vercel)

Ensure your Vercel project has the strictly correct environment variables. If you haven't changed them, they should be fine, but verify:

*   `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
*   `NEXT_PUBLIC_SITE_URL`: **REQUIRED** - The public URL of your app in Production (e.g., `https://mixnotes.app`). Ensure this is set in Vercel for Production environment.

(These are standard, but just a reminder).
