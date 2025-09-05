# 🚂 Railway Environment Variables

Copy and paste these **exact values** into Railway:

## Required Environment Variables

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://neondb_owner:npg_5PfpHdEwABo7@ep-autumn-brook-ad81t4je-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=network-crm-super-secret-key-2025-production-whatintheworldwasthat
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=sk-proj-[YOUR_OPENAI_KEY_HERE]
SITE_ACCESS_PASSWORD=NetworkCRM2025!
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

## How to Add in Railway

1. **Go to Railway Dashboard**
2. **Select your deployed project**  
3. **Click "Variables" tab**
4. **Add each variable one by one**:
   - Click "+ New Variable"
   - Enter Name (e.g., `NODE_ENV`)
   - Enter Value (e.g., `production`)
   - Click "Add"
   - Repeat for all variables

## Important Notes

- **DATABASE_URL**: Your Neon PostgreSQL database (already connected)
- **OPENAI_API_KEY**: Your OpenAI API key for AI features
- **SITE_ACCESS_PASSWORD**: Password users enter to access the site
- **JWT_SECRET**: Unique secret for secure user sessions
- **SMTP_USER/PASS**: Leave empty for now (email notifications optional)

## Test After Adding Variables

Your Railway app should restart automatically. Test:
- Visit your Railway URL (e.g., `https://your-app.railway.app/health`)
- Should return: `{"status":"OK","timestamp":"..."}`

If you get errors, check the Railway logs in the "Deployments" tab.

---

**All variables needed for full functionality!** 🚀