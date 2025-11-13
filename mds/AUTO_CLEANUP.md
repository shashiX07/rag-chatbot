# Auto-Cleanup Feature

This project includes automatic cleanup of documents older than 30 minutes.

## How It Works

### 1. Database Function
The `supabase-setup.sql` includes functions to delete documents older than 30 minutes:
- `cleanup_old_documents()` - Deletes old documents
- `trigger_cleanup()` - Returns count of deleted documents

### 2. API Endpoint
**`/api/cleanup`** - Triggers cleanup of documents older than 30 minutes

**Method:** POST or GET  
**Authentication:** Optional (via CRON_SECRET env variable)

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed. Deleted 5 old documents.",
  "deletedCount": 5,
  "timestamp": "2025-11-13T12:00:00.000Z"
}
```

### 3. Automatic Scheduling (Vercel Cron)

The `vercel.json` file configures automatic cleanup every 5 minutes:

```json
{
  "crons": [
    {
      "path": "/api/cleanup",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Note:** Vercel Cron Jobs are only available on:
- Pro and Enterprise plans
- Deployed projects (not local development)

## Manual Cleanup

### Option 1: Clear Database Button (UI)
Click the **"🗄️ Clear Database"** button in the chat interface to delete ALL documents immediately.

### Option 2: API Call
```bash
# Trigger cleanup manually
curl -X POST https://your-app.vercel.app/api/cleanup

# Or with authentication
curl -X POST https://your-app.vercel.app/api/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 3: Direct Database Query
Run in Supabase SQL Editor:
```sql
-- Delete all documents
DELETE FROM documents;

-- Or delete only old ones
DELETE FROM documents 
WHERE created_at < NOW() - INTERVAL '30 minutes';
```

## Configuration

### Change Cleanup Interval

#### In Vercel Cron (vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/cleanup",
      "schedule": "0 * * * *"  // Every hour
    }
  ]
}
```

#### In API Route (app/api/cleanup/route.ts):
```typescript
// Change from 30 minutes to 1 hour
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

const { error, count } = await supabase
  .from('documents')
  .delete()
  .lt('created_at', oneHourAgo);
```

### Add Cron Authentication

1. Generate a random secret:
```bash
openssl rand -base64 32
```

2. Add to `.env.local`:
```bash
CRON_SECRET=your_generated_secret_here
```

3. Add to Vercel Environment Variables:
   - Go to Project Settings → Environment Variables
   - Add `CRON_SECRET` with your secret value

4. The API automatically checks for this in the request header.

## Alternative: External Cron Services

If not using Vercel Pro, you can use external cron services:

### 1. EasyCron (Free)
- Sign up at https://www.easycron.com/
- Create cron job: `https://your-app.vercel.app/api/cleanup`
- Schedule: Every 5 minutes

### 2. GitHub Actions (Free)
Create `.github/workflows/cleanup.yml`:

```yaml
name: Cleanup Old Documents
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cleanup
        run: |
          curl -X POST https://your-app.vercel.app/api/cleanup \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### 3. Supabase Edge Functions (Free)
Create a Supabase Edge Function that runs on schedule:

```typescript
// supabase/functions/cleanup/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const response = await fetch('https://your-app.vercel.app/api/cleanup', {
    method: 'POST'
  });
  
  return new Response(await response.text(), {
    status: response.status
  });
});
```

## Testing

### Test Manual Cleanup
```bash
# Test the cleanup endpoint
npm run dev

# In another terminal
curl http://localhost:3000/api/cleanup
```

### Test Clear Database Button
1. Upload some documents
2. Click "🗄️ Clear Database"
3. Confirm deletion
4. Check Supabase dashboard - documents table should be empty

## Monitoring

### Check Cleanup Logs (Vercel)
1. Go to your Vercel project
2. Navigate to "Logs"
3. Filter by "/api/cleanup"
4. See cleanup execution and deleted counts

### Check Database
```sql
-- See all documents and their age
SELECT 
  id,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as age_minutes,
  metadata->>'filename' as filename
FROM documents
ORDER BY created_at DESC;

-- Count documents older than 30 minutes
SELECT COUNT(*) 
FROM documents 
WHERE created_at < NOW() - INTERVAL '30 minutes';
```

## Troubleshooting

### Cleanup Not Running
1. **Vercel Free Tier:** Cron jobs not supported - use external service
2. **Check Logs:** Vercel dashboard → Logs → Filter by "cleanup"
3. **Test Manually:** Call `/api/cleanup` endpoint directly

### Documents Not Deleting
1. **Check Permissions:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct
2. **Check RLS:** Verify Row Level Security policies allow deletion
3. **Check Time:** Verify documents are actually older than 30 minutes

### Cleanup Too Aggressive
- Increase interval in `vercel.json`
- Increase time threshold in `/api/cleanup/route.ts`
- Disable auto-cleanup and use manual button only

## Security Considerations

1. **Rate Limiting:** Consider adding rate limiting to prevent abuse
2. **Authentication:** Use `CRON_SECRET` for production
3. **Logging:** Monitor cleanup activity
4. **Backup:** Consider backing up important documents before deletion

## Best Practices

1. **Test First:** Test cleanup in development before production
2. **Monitor:** Check logs regularly to ensure cleanup is working
3. **Notify Users:** Add UI notice about auto-deletion
4. **Soft Delete:** Consider soft delete (flag) instead of hard delete
5. **Backup:** Export important documents before auto-cleanup

## Disabling Auto-Cleanup

### Option 1: Remove Cron Job
Delete or comment out in `vercel.json`:
```json
{
  "crons": []
}
```

### Option 2: Keep Manual Button Only
Remove the cron configuration but keep the `/api/cleanup` endpoint for manual triggering.

### Option 3: Increase Interval to Very Long
```json
{
  "crons": [
    {
      "path": "/api/cleanup",
      "schedule": "0 0 * * 0"  // Once per week
    }
  ]
}
```

---

**Remember:** The SQL files (`supabase-setup.sql` and `FIX_VECTOR_DIMENSION.sql`) should be kept in the repository - they are essential for setting up new instances of the database!
