# Role-Based Permission Matrix

## User Roles Hierarchy
1. **CREW_LEADER** - Full control over crew and data
2. **ADMIN** - Manage crew data and moderate content  
3. **MEMBER** - Create/edit their own content, view shared data
4. **VIEWER** - Read-only access to shared data

## Permission Matrix

### ✅ Contact Management

| Operation | CREW_LEADER | ADMIN | MEMBER | VIEWER |
|-----------|-------------|-------|---------|---------|
| View contacts | ✅ | ✅ | ✅ | ✅ |
| Create contacts | ✅ | ✅ | ✅ | ❌ |
| Edit own contacts | ✅ | ✅ | ✅ | ❌ |
| Edit others' contacts | ✅ | ✅ | ❌ | ❌ |
| Delete single contact | ✅ | ✅ | ❌ | ❌ |
| Bulk delete contacts | ✅ | ✅ | ❌ | ❌ |
| Import contacts | ✅ | ✅ | ✅ | ❌ |

### 🔗 Relationship Management  

| Operation | CREW_LEADER | ADMIN | MEMBER | VIEWER |
|-----------|-------------|-------|---------|---------|
| View relationships | ✅ | ✅ | ✅ | ✅ |
| Create relationships | ✅ | ✅ | ✅ | ❌ |
| Edit relationships | ✅ | ✅ | ✅ | ❌ |
| Delete relationships | ✅ | ✅ | ✅ | ❌ |

### 📧 Campaign Management

| Operation | CREW_LEADER | ADMIN | MEMBER | VIEWER |
|-----------|-------------|-------|---------|---------|
| View campaigns | ✅ | ✅ | ✅ | ✅ |
| Create campaigns | ✅ | ✅ | ✅ | ❌ |
| Edit own campaigns | ✅ | ✅ | ✅ | ❌ |
| Edit others' campaigns | ✅ | ✅ | ❌ | ❌ |
| Delete campaigns | ✅ | ✅ | ❌ | ❌ |
| Send outreach | ✅ | ✅ | ✅ | ❌ |

### 👥 Crew Management

| Operation | CREW_LEADER | ADMIN | MEMBER | VIEWER |
|-----------|-------------|-------|---------|---------|
| View crew members | ✅ | ✅ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ | ❌ |
| Change member roles | ✅ | ❌ | ❌ | ❌ |
| Generate join codes | ✅ | ✅ | ❌ | ❌ |
| View crew analytics | ✅ | ✅ | ❌ | ❌ |

### 📊 Analytics & Network

| Operation | CREW_LEADER | ADMIN | MEMBER | VIEWER |
|-----------|-------------|-------|---------|---------|
| View network graph | ✅ | ✅ | ✅ | ✅ |
| View analytics | ✅ | ✅ | ✅ | ✅ |
| AI insights | ✅ | ✅ | ✅ | ✅ |

## Implementation Status

### ✅ Implemented Protections
- ✅ Contact deletion (single & bulk) - CREW_LEADER/ADMIN only
- ✅ Crew member management - Role-based restrictions
- ✅ Bulk operations limits (max 100 contacts)

### 🚧 Need Protection
- Campaign creation/deletion permissions
- File upload restrictions  
- Data export restrictions
- Account settings changes

### 📝 Recommendations
1. **Members can create relationships** - They know their own network best
2. **Members can import contacts** - Essential for collaboration  
3. **Viewers are read-only** - Cannot modify any shared data
4. **Admins cannot remove crew members** - Only crew leaders can
5. **Bulk operation limits** - Prevent accidental mass deletions