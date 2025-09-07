# TrueCrew Referral Request System - Database Schema

## New Models to Add

```prisma
model ReferralRequest {
  id          String   @id @default(cuid())
  
  // Request details
  requesterId String   // Who wants the intro
  facilitatorId String // Who owns the contact
  contactId   String   // Target contact for intro
  
  // Request context
  purpose     String   // "Series A funding", "Job referral", etc.
  message     String   // Personalized request message
  urgency     RequestUrgency @default(NORMAL)
  
  // AI assistance
  aiSuggestedIntro String?  // Generated introduction draft
  talkingPoints    String[] // Conversation starters
  
  // Status tracking
  status      RequestStatus @default(PENDING)
  
  // Response tracking
  respondedAt   DateTime?
  facilitatorResponse String? // Accept/decline reason
  introductionSent   Boolean @default(false)
  introSentAt       DateTime?
  
  // Follow-up tracking
  meetingScheduled  Boolean @default(false)
  meetingDate      DateTime?
  outcome          RequestOutcome?
  followUpNotes    String?
  
  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  expiresAt DateTime? // Auto-expire after 30 days
  
  // Relations
  account     Account @relation(fields: [accountId], references: [id])
  accountId   String
  
  requester   User @relation("RequestedBy", fields: [requesterId], references: [id])
  facilitator User @relation("FacilitatedBy", fields: [facilitatorId], references: [id])
  contact     Contact @relation(fields: [contactId], references: [id])
  
  // Activity tracking
  activities  ReferralActivity[]
  
  @@map("referral_requests")
}

model ReferralActivity {
  id        String @id @default(cuid())
  
  // Activity details
  type      ActivityType
  description String
  metadata  Json?        // Flexible data storage
  
  // Timing
  createdAt DateTime @default(now())
  
  // Relations
  request   ReferralRequest @relation(fields: [requestId], references: [id])
  requestId String
  
  actor     User @relation(fields: [actorId], references: [id])
  actorId   String
  
  @@map("referral_activities")
}

// Enums
enum RequestUrgency {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum RequestStatus {
  PENDING      // Waiting for facilitator response
  ACCEPTED     // Facilitator agreed to make intro
  DECLINED     // Facilitator declined
  IN_PROGRESS  // Introduction email sent
  COMPLETED    // Meeting happened/connection made
  EXPIRED      // Request timed out
  CANCELLED    // Requester cancelled
}

enum RequestOutcome {
  MEETING_SCHEDULED
  EMAIL_EXCHANGED
  CONNECTION_MADE
  NO_RESPONSE
  NOT_INTERESTED
  SUCCESSFUL_OUTCOME
}

enum ActivityType {
  REQUEST_CREATED
  REQUEST_VIEWED
  REQUEST_ACCEPTED
  REQUEST_DECLINED
  INTRODUCTION_SENT
  MEETING_SCHEDULED
  OUTCOME_RECORDED
  MESSAGE_SENT
  FOLLOW_UP_ADDED
}
```

## Updated User Model

```prisma
model User {
  // ... existing fields ...
  
  // Referral relationships
  referralRequestsMade ReferralRequest[] @relation("RequestedBy")
  referralRequestsReceived ReferralRequest[] @relation("FacilitatedBy")
  referralActivities ReferralActivity[]
  
  // Notification preferences
  emailNotifications   Boolean @default(true)
  pushNotifications    Boolean @default(true)
  weeklyDigest        Boolean @default(true)
}
```

## Updated Contact Model

```prisma
model Contact {
  // ... existing fields ...
  
  // Referral tracking
  referralRequests ReferralRequest[]
  
  // Connection strength (for AI prioritization)
  connectionStrength Float? // 0-1 scale based on interactions
  lastInteraction   DateTime?
  interactionCount  Int @default(0)
}
```