# ⚡ Vercel Environment Variables

Copy and paste these **exact values** into Vercel:

## Required Environment Variables

```
VITE_API_URL=https://api.whatintheworldwasthat.com
VITE_NODE_ENV=production
```

## How to Add in Vercel

1. **Go to Vercel Dashboard**
2. **Select your project** (`newday`)
3. **Go to Settings** → **Environment Variables**
4. **Add each variable**:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://api.whatintheworldwasthat.com`  
   - **Environment**: Production (and Preview if you want)
   - Click "Save"
   
   - **Name**: `VITE_NODE_ENV`
   - **Value**: `production`
   - **Environment**: Production
   - Click "Save"

## Important Notes

- **VITE_API_URL**: Points to your Railway backend API
- **VITE_NODE_ENV**: Tells the app it's in production mode
- **Variables starting with VITE_** are exposed to the frontend

## After Adding Variables

1. **Redeploy**: Go to "Deployments" → Click "..." → "Redeploy"
2. **Test**: Visit your Vercel URL to make sure it loads

## Build Settings (Double-Check)

Make sure these are set correctly:

- **Framework Preset**: Vite
- **Build Command**: `cd client && npm run build`
- **Output Directory**: `client/dist`
- **Root Directory**: (leave blank)

---

**Frontend will connect to your Railway backend!** 🚀