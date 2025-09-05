# ⚡ Quick Deploy to whatintheworldwasthat.com

## 🚀 Ready to Deploy!

Your code is now on GitHub at: https://github.com/mylesweissleder/newday

## Step 1: Deploy Backend to Railway (5 minutes)

1. **Go to Railway**: https://railway.app
2. **Sign in with GitHub** 
3. **Create New Project** → **Deploy from GitHub repo**
4. **Select**: `mylesweissleder/newday`
5. **Add Environment Variables** (copy/paste these exactly):
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
6. **Add Custom Domain**: `api.whatintheworldwasthat.com`
7. **Copy the Railway domain** (you'll need this for DNS)

## Step 2: Deploy Frontend to Vercel (3 minutes)

1. **Go to Vercel**: https://vercel.com  
2. **Import Project** from GitHub
3. **Select**: `mylesweissleder/newday`
4. **Configure**:
   - Framework: Vite
   - Build Command: `cd client && npm run build`
   - Output Directory: `client/dist`
5. **Environment Variables**:
   ```
   VITE_API_URL=https://api.whatintheworldwasthat.com
   VITE_NODE_ENV=production
   ```
6. **Add Custom Domains**:
   - `whatintheworldwasthat.com`
   - `www.whatintheworldwasthat.com`

## Step 3: Update DNS (2 minutes)

Add these DNS records to your domain:

```
Type: A
Name: @
Value: 76.76.19.61

Type: CNAME
Name: www  
Value: cname.vercel-dns.com

Type: CNAME
Name: api
Value: [YOUR-RAILWAY-DOMAIN].railway.app
```

## 🧪 Test Your Live Site

**Main Site**: https://whatintheworldwasthat.com
- Enter password: `NetworkCRM2025!`
- Login: `demo@networkcrm.com` / `demo123456`

**API Test**: https://api.whatintheworldwasthat.com/health

## 📊 Bulk Upload Features Available

Your live site includes:

✅ **Drag & Drop CSV Upload** - Upload any CSV file  
✅ **Smart Column Detection** - Auto-maps common fields  
✅ **Predefined List Imports** - Your LinkedIn, SFNT, Higher Tide, VC lists  
✅ **Bulk Processing** - Handle thousands of contacts  
✅ **Duplicate Detection** - Prevents duplicate contacts  
✅ **Source Attribution** - Tracks MW vs CH ownership  
✅ **AI-Powered Analysis** - Contact insights and messaging  

## 🔒 Security Features

✅ **Site Password Protection** - `NetworkCRM2025!`  
✅ **User Authentication** - Individual accounts required  
✅ **Encrypted Data** - All communications secured  
✅ **Environment Variables** - API keys secured  

---

## 🚨 The Railway Domain

**After Railway deployment**, you'll see a URL like:
- `https://network-crm-production.up.railway.app`
- `https://vigilant-seabird-123abc.railway.app`

**Use the domain part** (without https://) for your DNS:
- Example: `network-crm-production.up.railway.app`

---

**Your Network CRM will be live at whatintheworldwasthat.com within 10 minutes!** 🎉

Need help? Check `DNS_SETUP.md` for detailed DNS instructions.

**Password**: `NetworkCRM2025!`  
**Demo Login**: `demo@networkcrm.com` / `demo123456`