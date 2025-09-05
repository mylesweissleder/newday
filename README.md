# Network CRM - AI-Powered Contact Management System

A comprehensive CRM system designed to help you organize, analyze, and leverage your professional network using AI-powered insights and systematic relationship management.

## 🌟 Features

### Core Functionality
- **Multi-tenant account system** - Secure account management with role-based access
- **Advanced contact management** - Rich contact profiles with custom categorization
- **Relationship mapping** - Visualize and track connections between contacts
- **AI-powered insights** - Contact analysis and personalized outreach suggestions
- **Campaign management** - Organize and track outreach campaigns
- **Data import/export** - Import from LinkedIn, events, and CSV files
- **Analytics dashboard** - Comprehensive reporting and network analysis

### AI-Powered Features
- **Contact personality analysis** - AI insights into communication styles and interests
- **Smart recommendations** - AI-suggested contacts based on your goals
- **Personalized messaging** - Generate tailored outreach messages
- **Network analysis** - Identify key connectors and relationship clusters
- **Similar contact discovery** - Find contacts with shared characteristics

### Data Management
- **Import from multiple sources** - LinkedIn exports, event attendee lists, CSV files
- **Smart duplicate handling** - Automatically merge duplicate contacts
- **Tag and categorization system** - Flexible contact organization
- **Shared contact tracking** - Track contacts contributed by different team members
- **Bulk operations** - Efficient batch processing of contacts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon Cloud recommended)
- OpenAI API key

### Installation

1. **Clone and setup**
   ```bash
   git clone https://github.com/mylesweissleder/newday.git
   cd newday
   ./setup.sh
   ```

2. **Configure environment**
   Update `server/.env` with your credentials:
   ```env
   DATABASE_URL="your-neon-database-url"
   OPENAI_API_KEY="your-openai-api-key"
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 📊 Your Data Import

Your existing contact data is ready to import:

### Available Import Sources
1. **LinkedIn Connections** (`LinkedIn Connections 7.25 - Connections.csv`)
2. **SFNT Event Attendees** (`LI who Attended SFNT - reconciled_data_with_job_titles.csv`)  
3. **Community Managers** (`HEAD OF COMMUNITY USA.xlsx - MylesListCommunityManagers.csv`)
4. **Higher Tide Outreach List** (`The_Higher_Tide_MASTER_Outreach_List.csv`)
5. **VC Contacts** (`US Seed VCs + Sample lists - US seed VCs.csv`)

### Contact Attribution
- Initial contacts will be sourced to **MW** (Myles)
- Contacts from **CH** (Chris) files will be marked as **shared**
- System tracks who contributed each contact

## 🏗️ System Architecture

### Backend (Node.js + TypeScript)
- **Express.js** - REST API framework
- **Prisma** - Database ORM with PostgreSQL
- **JWT Authentication** - Secure user sessions
- **OpenAI Integration** - AI-powered features
- **CSV Processing** - Data import capabilities

### Frontend (React + TypeScript)
- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **React Query** - Server state management
- **Tailwind CSS** - Utility-first styling
- **D3.js** - Network visualizations
- **Recharts** - Analytics dashboards

### Database Schema
- **Accounts** - Multi-tenant organization
- **Users** - Account members with roles
- **Contacts** - Rich contact profiles
- **Relationships** - Contact-to-contact mappings
- **Campaigns** - Outreach campaign management
- **Outreach** - Communication tracking
- **AI Insights** - Stored analysis results

## 📈 Key Use Cases

### Network Mining
- **Systematic Contact Review** - AI helps prioritize contacts based on your goals
- **Relationship Analysis** - Identify key connectors and influence patterns
- **Opportunity Discovery** - Surface collaboration and business opportunities

### Outreach Management  
- **Campaign Creation** - Organize contacts into targeted outreach campaigns
- **Message Personalization** - AI generates context-aware outreach messages
- **Response Tracking** - Monitor engagement and response rates

### Data Intelligence
- **Network Analytics** - Understand your network composition and growth
- **Contact Insights** - AI-powered personality and communication analysis  
- **Performance Metrics** - Track outreach effectiveness and relationship building

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - User login
- `POST /api/auth/invite` - Invite team members

### Contacts
- `GET /api/contacts` - List contacts with filtering
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `GET /api/contacts/:id` - Get contact details

### AI Features
- `POST /api/ai/analyze-contact/:id` - AI contact analysis
- `POST /api/ai/analyze-network` - Network insights
- `POST /api/ai/generate-message/:id` - Generate outreach message

### Import/Export
- `POST /api/import/linkedin` - Import LinkedIn contacts
- `POST /api/import/event/:type` - Import event attendees
- `GET /api/analytics/export` - Export data

## 🚀 Deployment

### Production Setup
1. Set up PostgreSQL database
2. Configure environment variables
3. Build applications:
   ```bash
   npm run build
   ```
4. Deploy using your preferred platform (Vercel, Railway, etc.)

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://..."

# Authentication  
JWT_SECRET="your-secret-key"

# AI Features
OPENAI_API_KEY="sk-..."

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="app-password"
```

## 🤝 Team Collaboration

### User Roles
- **Admin** - Full system access, user management
- **Member** - Contact and campaign management  
- **Viewer** - Read-only access

### Shared Resources
- Contacts marked as **shared** are visible to all team members
- Campaign collaboration with assignment tracking
- Activity logs for transparency

## 📊 Analytics & Reporting

### Dashboard Metrics
- Network growth over time
- Contact tier distribution  
- Outreach performance
- Response rate analytics
- Top performing contacts

### Network Analysis
- Industry cluster identification
- Relationship strength mapping
- Key connector identification
- Influence pattern analysis

## 🔄 Data Management

### Import Features
- **Smart duplicate detection** - Prevents duplicate contacts
- **Data enrichment** - Enhances existing contact profiles  
- **Source attribution** - Tracks data provenance
- **Batch processing** - Handles large datasets efficiently

### Export Capabilities
- Contact database exports
- Campaign performance reports
- Network analysis data
- Custom filtered datasets

## 🛡️ Security & Privacy

- **JWT-based authentication** with secure session management
- **Role-based access control** for team environments  
- **Data encryption** for sensitive information
- **API rate limiting** to prevent abuse
- **Input validation** and sanitization

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core CRM functionality
- ✅ AI-powered insights
- ✅ Data import system
- ✅ Basic analytics

### Phase 2 (Future)
- 🔄 Network visualization (D3.js graphs)
- ⏳ Email integration
- ⏳ Calendar sync
- ⏳ Mobile app

### Phase 3 (Future)
- ⏳ Advanced AI recommendations
- ⏳ Integration with LinkedIn API
- ⏳ Team collaboration features
- ⏳ Advanced reporting

## 📞 Support

For technical issues or questions:
- Create issues in the GitHub repository
- Review the API documentation in `/server/src/routes/`
- Check the database schema in `/server/prisma/schema.prisma`

## 📄 License

This project is proprietary software. All rights reserved.

---

**Built for systematic network mining and relationship leverage** 🚀