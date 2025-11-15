# User Data Flow - Mentorship & Training Management System

## Overview
This document outlines the complete user data flow for the Mentorship & Training Management System, showing how different user types (Admin, Mentor, Mentee) interact with the platform and the data transformations that occur.

## User Roles & Detailed Functionalities

### 🔵 ADMIN - System Master Controller
**Core Capabilities:**
- **User Management**: View all users (`GET /api/users`), approve mentor applications, activate/deactivate accounts
- **Session Oversight**: View all sessions across mentors (`GET /api/sessions`), can modify any session
- **Announcement Management**: Create system-wide announcements targeted to specific roles (`POST /api/announcements`)
- **Resource Management**: Full CRUD access to all resources (`GET/POST/PUT/DELETE /api/resources`)
- **Analytics Dashboard**: Access to comprehensive user statistics, session analytics, and system metrics
- **Chat Moderation**: Can view all chat groups and direct messages for moderation purposes

**Specific Interactions with Other Users:**
- **With Mentors**: Approve mentor applications, send approval/rejection notifications, monitor mentor performance
- **With Mentees**: View mentee progress, send system announcements, access mentee analytics
- **With System**: Complete oversight, configuration management, data export capabilities

### 🟡 MENTOR - Training Facilitator & Knowledge Provider
**Core Capabilities:**
- **Session Management**: Create training sessions (`POST /api/admin/sessions`), assign specific mentees, manage session lifecycle (SCHEDULED→IN_PROGRESS→COMPLETED)
- **Resource Sharing**: Upload files up to 5MB (`POST /api/resources`), categorize resources, manage own uploads
- **Mentee Communication**: Direct messaging with assigned mentees, respond to mentee queries
- **Session Delivery**: Conduct live sessions, real-time interaction with mentee participants
- **Progress Tracking**: View attendance, session completion rates, mentee engagement metrics

**Specific Interactions with Other Users:**
- **With Mentees**: Assign mentees to sessions, conduct training, provide feedback, respond to queries, share resources
- **With Admins**: Submit registration for approval, receive notifications about account status, provide session reports
- **With Other Mentors**: Cannot directly interact (no mentor-to-mentor messaging), can see other mentors in chat groups

### 🟢 MENTEE - Learner & Training Participant
**Core Capabilities:**
- **Session Participation**: Join assigned sessions, attend live training, participate in Q&A
- **Resource Access**: Download training materials, view categorized resources, track download history
- **Communication**: Direct messaging with assigned mentors, participate in general chat groups, real-time chat during sessions
- **Learning Tracking**: View personal session history, track completion progress, access learning materials
- **Profile Management**: Update personal information, view learning progress, download certificates

**Specific Interactions with Other Users:**
- **With Mentors**: Attend mentor-led sessions, message mentors directly, receive resources, get feedback
- **With Admins**: Receive system announcements, submit queries through support channels
- **With Other Mentees**: Participate in general chat groups, collaborate in group activities, share learning experiences

---

## 💬 Detailed User Interactions & Workflows

### 🔵 ADMIN ↔ MENTOR Interactions

#### 1. Mentor Approval Workflow
```
Mentor Registration → Admin Review → Approval Decision → Notification to Mentor
```
**Specific Flow:**
1. **Mentor submits application** (`POST /api/auth/register` with role: 'MENTOR')
   - Status: `PENDING_APPROVAL`, `verified: true`
   - Mentor cannot login yet
   
2. **Admin reviews application** (Admin Dashboard → Users page)
   - Admin sees mentor in "Pending Approval" section
   - Admin can view mentor details, CV, experience
   
3. **Admin approves/rejects** (`PUT /api/users/{userId}/status`)
   - **Approval**: Status → `ACTIVE`, notification sent to mentor
   - **Rejection**: Status → `INACTIVE`, rejection email sent
   
4. **Mentor receives notification** and can now login

#### 2. Performance Monitoring
```
Admin → Mentor Performance Tracking → Analytics Dashboard → Reports
```
- Admin monitors mentor session completion rates
- Views mentee feedback and ratings
- Accesses mentor upload statistics
- Generates mentor performance reports

### 🟡 MENTOR ↔ MENTEE Interactions

#### 1. Session Assignment & Execution
```
Mentor Creates Session → Mentee Invitation → Session Execution → Progress Tracking
```
**Detailed Workflow:**
1. **Session Creation** (`POST /api/sessions`)
   ```
   Mentor provides:
   - Title, description, scheduled date/time
   - Duration (in minutes)
   - Selected mentee IDs from available list
   ```
   
2. **Mentee Notification**
   - Real-time notification via Socket.IO: `new_notification`
   - Email notification about upcoming session
   - Session appears in mentee's calendar

3. **Session Execution**
   - **Before session**: Mentee can message mentor with pre-session questions
   - **During session**: Real-time chat, video calling, screen sharing
   - **Session status updates**: `SCHEDULED` → `IN_PROGRESS` → `COMPLETED`

4. **Post-Session Follow-up**
   - Mentor uploads session notes/resources
   - Mentee receives additional materials
   - Both can continue discussion via chat

#### 2. Resource Sharing Workflow
```
Mentor Uploads Resource → Categorization → Mentee Access → Download Tracking
```
**Specific Flow:**
1. **Resource Upload** (`POST /api/resources` with multer)
   - File: PDF, DOCX, Video files (max 5MB)
   - Mentor adds title, description, category
   - File stored in `/uploads/` directory
   
2. **Mentee Discovery**
   - Mentees browse resources by category
   - Search functionality for resources
   - Filter by mentor/upload date
   
3. **Resource Access**
   - Download tracking for analytics
   - Access history logged
   - Mentor can see download statistics

#### 3. Direct Communication Patterns
```
Query Initiation → Real-time Discussion → Resolution → Follow-up
```
**Message Flow:**
- **Mentee initiates**: "Hi, I have questions about the Python session"
- **Real-time chat**: Socket.IO enables instant messaging
- **Typing indicators**: Shows when mentor/mentee is typing
- **File sharing**: Within chat messages
- **Message history**: Persistent storage for future reference

### 🟢 MENTEE ↔ MENTEE Interactions

#### 1. General Chat Group Participation
```
Auto-Join to General Chat → Peer Discussion → Collaboration
```
**How it Works:**
- All mentees automatically join "General Chat" upon verification
- Peer support: Questions, study groups, resource sharing
- Learning collaboration: Discussion of session content
- Social interaction: Community building

#### 2. Peer Learning Scenarios
- **Study group formation**: Mentees create private chat groups
- **Resource sharing**: Peer-to-peer file sharing (if permitted)
- **Homework collaboration**: Group assignments and projects
- **Exam preparation**: Study sessions and review groups

### 🔄 Cross-Role Communication Patterns

#### 1. Announcement System
```
Admin creates announcement → Role targeting → Delivery → Read tracking
```
**Specific Roles:**
- **Admin → All Users**: System-wide announcements
- **Admin → Mentors**: Training updates, policy changes
- **Admin → Mentees**: Program announcements, schedule changes
- **Mentor → Assigned Mentees**: Session-specific updates

#### 2. Notification Hierarchy
```
System Event → Notification Generation → Role-based Delivery → User Action
```
**Real-time Notifications:**
- **Socket.IO events**: `new_notification`, `new_message`, `session_reminder`
- **Email notifications**: Important updates, session reminders
- **In-app notifications**: Dashboard alerts, chat messages

---

## 🔧 Functionality Breakdown by User Role

### 🔵 ADMIN Functionality Matrix

#### User Management Functions
| Function | API Endpoint | Description | Target User |
|---------|-------------|-------------|-------------|
| View All Users | `GET /api/users` | Retrieve complete user list with filters | Self + All Users |
| Approve Mentor | `PUT /api/users/{id}/status` | Change status from PENDING_APPROVAL to ACTIVE | Mentors |
| Deactivate User | `PUT /api/users/{id}/status` | Set status to INACTIVE | Any User |
| User Statistics | `GET /api/users/stats` | Analytics dashboard data | Self |

#### Session Management Functions  
| Function | API Endpoint | Description | Scope |
|---------|-------------|-------------|--------|
| View All Sessions | `GET /api/sessions` | See sessions across all mentors | System-wide |
| Modify Any Session | `PUT /api/sessions/{id}` | Edit session details | Any Session |
| Monitor Progress | Analytics Dashboard | Real-time session metrics | All Mentors |

#### Announcement Functions
| Function | API Endpoint | Target Audience | Content Type |
|---------|-------------|-----------------|-------------|
| System Announcement | `POST /api/announcements` | All Users | Platform updates |
| Mentor Notice | `POST /api/ajurukemenus` | Mentors Only | Policy changes |
| Mentee Notice | `POST /api/ajurukemenus` | Mentees Only | Program updates |

### 🟡 MENTOR Functionality Matrix

#### Session-Related Functions
| Function | API Endpoint | Input Data | Output | Mentee Impact |
|---------|-------------|------------|---------|----------------|
| Create Session | `POST /api/sessions` | title, date, duration, menteeIds | Session created | Notification sent |
| Update Session | `PUT /api/sessions/{id}` | Any session fields | Session updated | Notification sent |
| View Own Sessions | `GET /api/sessions` | Filter by mentorId | Session list | None |
| Start Session | `PUT /api/sessions/{id}` | status: 'IN_PROGRESS' | Session active | Real-time join option |
| Complete Session | `PUT /api/sessions/{id}` | status: 'COMPLETED' | Session archived | Access to follow-up materials |

#### Resource Management Functions
| Function | API Endpoint | File Constraints | Categorization | Access Control |
|---------|-------------|-------------------|----------------|---------------|
| Upload Resource | `POST /api/resources` | Max 5MB, PDF/DOCX/Video | Mentor-defined categories | Own resources + Admin access |
| Manage Resources | `PUT/DELETE /api/resources/{id}` | Edit title/description/category | Change categorization | Ownership validation |
| Track Downloads | Analytics Dashboard | Download statistics | Usage metrics | Resource performance |

#### Communication Functions
| Function | Channel Type | Target Audience | Content Type | Real-time |
|---------|-------------|----------------|-------------|-----------|
| Direct Message | Socket.IO | Specific Mentees | Text + File attachments | Yes |
| Session Chat | Socket.IO | Session Participants | During live sessions | Yes |
| Video Calls | WebRTC | 1-on-1 or Group | Audio/Video | Yes |
| Group Discussions | General Chat | All system participants | Peer interactions | Yes |

### 🟢 MENTEE Functionality Matrix

#### Learning Functions
| Function | User Action | System Response | Timeline |
|---------|-------------|-----------------|---------|
| View Session Schedule | Dashboard calendar | Scheduled sessions visible | Real-time |
| Join Live Session | Click "Join Session" | Redirect to session interface | When status = 'IN_PROGRESS' |
| Download Resources | Click download link | File transfer initiated | Immediate |
| View Progress | Dashboard analytics | Completion percentages, progress charts | Real-time updates |

#### Communication Functions
| Function | Channel Type | Initiator | Response Time | Content Limits |
|---------|-------------|-----------|--------------|---------------|
| Ask Mentor Question | Direct Message | Self | Real-time | Text + File attachments |
| Participate in Group Chat | Socket.IO Room | Peer/Auto-join | Real-time | Text + Emojis |
| Join Video Call | WebRTC | Mentor/Call invitation | Instant | Audio/Video streaming |
| Session Q&A | In-session Chat | Session participants | Real-time | Text during live sessions |

#### Resource Access Functions
| Function | Access Level | Limitations | Download Management |
|---------|-------------|------------|-------------------|
| Browse Resources | Read-only | Mentor-defined categories | Tracked for analytics |
| Search Resources | Keyword search | Category + date filters | Unlimited downloads |
| Access Materials | File download | 5MB individual file limit | Browser-based downloads |

---

## 🎯 Real-World Interaction Scenarios

### Scenario 1: New Mentor Onboarding Process
```
Sarah (New Mentor) Register → Admin Review → Approval → First Session Creation → Student Interactions
```

**Detailed Steps:**
1. **Sarah registers** as mentor (`POST /api/auth/register`)
   - Provides: name, email, password, role: 'MENTOR'
   - Status: `PENDING_APPROVAL`, cannot login yet
   
2. **John (Admin) reviews** the application
   - Dashboard → Users → Pending Approvals
   - Reviews Sarah's credentials and experience
   - Approves: `PUT /api/users/sarah-id/status` → `ACTIVE`
   
3. **Sarah receives notification** and can now login
   - First login redirects to Mentor Dashboard
   - Sarah creates her first session: "Introduction to Web Development"
   
4. **Session creation triggers notifications**
   - Selected mentees get real-time notification
   - Session appears in mentee calendars
   - Pre-session communication begins

### Scenario 2: Live Training Session Execution
```
Mentor Starts Session → Mentees Join → Interactive Learning → Real-time Chat → Session Completion
```

**Live Session Flow:**
1. **Mentor Alex** prepares for "React Components Session"
   - Updates session status: `SCHEDULED` → `IN_PROGRESS`
   - Mentees receive real-time notification
   
2. **Students (Emma, James, Lisa)** join the session
   - Click "Join Session" button
   - Redirected to video calling interface
   - Connected via WebRTC audio/video
   
3. **Interactive Learning Environment**
   - **Alex**: Shares screen showing React code
   - **Real-time chat**: Students ask questions via Socket.IO
   - **Typing indicators**: Shows when someone is typing
   - **Whiteboard**: Collaborative coding session
   
4. **Resource Sharing During Session**
   - Alex uploads code examples mid-session
   - Students receive instant access notifications
   - Files available for immediate download
   
5. **Session Completion**
   - Alex marks session as `COMPLETED`
   - Students receive follow-up materials
   - Chat continues for Q&A after official session end

### Scenario 3: Cross-Role Communication Chain
```
Architectural Decision → Admin Announcement → Mentor Implementation → Student Feedback Loop
```

**System-wide Communication:**
1. **Admin Karen** decides to introduce new assessment format
   - Creates announcement: "New Quiz System Launch" (`POST /api/announcements`)
   - Targets: All Users (mentors and mentees)
   
2. **Mentor Carlos** receives notification and implements change
   - Uploads new syllabus with quiz sections
   - Creates session specifically for quiz preparation
   - Assigns mentees to new assessment sessions
   
3. **Student Feedback Collection**
   - Students attend Carlos's quiz preparation session
   - Submit feedback through direct messages
   - Carlos aggregates feedback and reports to Admin
   
4. **System Iteration**
   - Karen reviews feedback from Carlos and other mentors
   - Makes platform adjustments based on user input
   - Issues follow-up announcement with improvements

### Scenario 4: Peer Learning & Collaboration
```
Student Learning Group → Resource Sharing → Peer Teaching → Community Building
```

**Mentee-to-Mentee Interactions:**
1. **Emma** asks question in General Chat
   - "Anyone struggling with async/await in JavaScript?"
   - Real-time responses from peers via Socket.IO
   
2. **Study Group Formation**
   - Emma and 3 other mentees create private study group
   - Share screen for peer code reviews
   - Upload practice exercises to shared resources
   
3. **Peer Mentoring**
   - Experienced student James helps Lisa with debugging
   - Video call setup through platform's WebRTC
   - Shared knowledge benefits entire group
   
4. **Community Building**
   - Students organize weekend coding challenges
   - Share solutions and discuss approaches
   - Build stronger learning community beyond formal sessions

---

## 🔄 Complete User Data Flow

### Phase 1: Account Creation & Verification

#### For MENTEES:
```
User Registration → Email Verification Required → Account Activated
```
1. **Registration** (`POST /api/auth/register`)
   - User provides: name, email, password
   - Password hashed with bcrypt
   - Verification token generated (24h expiry)
   - Status: `verified: false`
   - Auto-added to "General Chat" group

2. **Email Verification Process**
   - Verification email sent with token
   - User clicks link: `/verify-email?token=${token}`
   - Token validated against database
   - User status updated: `verified: true`
   - Welcome email sent
   - User can now login

#### For MENTORS:
```
User Registration → Admin Approval Required → Account Activated
```
1. **Registration** (`POST /api/auth/register`)
   - User provides: name, email, password, role: 'MENTOR'
   - Status: `PENDING_APPROVAL`, `verified: true`
   - No tokens provided (cannot login yet)
   - Awaiting admin approval

2. **Admin Approval Process**
   - Admin reviews in `/users` page
   - Status updated: `ACTIVE` or `INACTIVE`
   - Approval notification sent
   - Mentor can now login

### Phase 2: Authentication & Authorization

#### Login Flow:
```
Credentials → JWT Tokens → Role-based Access Control
```
1. **Authentication** (`POST /api/auth/login`)
   - Email/password validation
   - Role and status checks:
     - Mentee: Must be verified
     - Mentor: Must be approved
   - JWT tokens generated: accessToken (15m), refreshToken (7d)
   - User redirected to role-specific dashboard

2. **Authorization Middleware**
   - Route protection based on user role
   - JWT token validation on protected routes
   - Automatic token refresh mechanism

### Phase 3: Core Platform Activities

#### 🎯 Training Sessions Workflow

**MENTOR Creates Session:**
```
Session Creation → Mentee Assignment → Scheduling → Session Management
```
1. **Session Creation** (`POST /api/sessions`)
   - Mentor provides: title, description, date, duration, menteeIds
   - Session status: `SCHEDULED`
   - Mentees notified via notifications

2. **Session Management**
   - Status updates: `SCHEDULED` → `IN_PROGRESS` → `COMPLETED`
   - Real-time updates via WebSocket
   - Participants can join via calendar integration

**MENTEE Joins Session:**
```
Session Invitation → Attendance → Participation → Progress Tracking
```
1. **Session Access**
   - View assigned sessions in dashboard
   - Calendar integration for scheduling
   - Join session when status becomes "IN_PROGRESS"

#### 💬 Real-time Communication System

**Chat Architecture:**
```
Socket.IO Connection → Authentication → Message Routing → Real-time Delivery
```
1. **Socket Connection**
   - Authentication with JWT token
   - User joins personal room: `user_${userId}`
   - Connection tracking for online status

2. **Message Types**
   - **Direct Messages**: Between users (mentor-mentee communication)
   - **Group Messages**: General chat, session-specific groups
   - **System Notifications**: Real-time updates

3. **Message Flow**
   - Message created in database (`messages` table)
   - Real-time delivery via Socket.IO
   - Notification created for recipients
   - Typing indicators and message status

**Video Calling Integration:**
```
WebRTC Signaling → Peer Connection → Video/Audio Stream → Call Management
```
- WebRTC-based video calling
- Real-time signaling via Socket.IO
- Call management: initiate, answer, end

#### 📚 Resource Management

**Resource Upload (Mentors/Admins):**
```
File Upload → Processing → Database Storage → Access Control
```
1. **Resource Creation** (`POST /api/resources`)
   - File upload via multer (5MB limit)
   - Metadata stored: title, description, category
   - File stored in `/uploads` directory
   - Access permissions based on role

**Resource Access (All Users):**
```
Resource Discovery → Permission Check → Download/Multiple Access
```
- Browse by category
- Search functionality
- Download tracking
- Access logging

#### 📢 Announcements System

**Announcement Flow:**
```
Creation → Role Targeting → Delivery → Read Tracking
```
1. **Announcement Creation** (Admins/Mentors)
   - Target specific roles or all users
   - Rich text formatting support
   - Creation timestamp and author tracking

2. **Announcement Delivery**
   - Role-based filtering in queries
   - Real-time notifications for new announcements
   - Dashboard displays latest announcements

#### 📊 Analytics & Reporting

**Data Collection Points:**
- Session attendance and completion rates
- Resource download statistics
- Message activity metrics
- User engagement patterns

**Dashboard Analytics:**
- Role-specific dashboards with relevant metrics
- Real-time statistics and charts
- Performance tracking for mentees
- System-wide analytics for admins

### Phase 4: User Management & Administration

#### Admin User Management:
```
User Review → Status Updates → System Oversight → Analytics Access
```
1. **User Overview**
   - Complete user list with filtering options
   - Status management (ACTIVE/INACTIVE)
   - Role verification and assignments

2. **System Administration**
   - Approve mentor applications
   - Manage system-wide announcements
   - Monitor platform health and usage
   - Access comprehensive analytics

### Phase 5: Data Storage & Persistence

#### Database Entities:
**User Entity:**
- Personal information (name, email, role, status)
- Authentication data (passwordHash, verification tokens)
- Timestamps (createdAt, updatedAt)

**Session Entity:**
- Session details (title, description, date, duration)
- Status tracking (SCHEDULED → IN_PROGRESS → COMPLETED)
- Mentor-relation with mentee assignments

**Message Entity:**
- Content, sender, receiver/group
- Timestamps for chat history
- Support for both direct and group messaging

**Resource Entity:**
- File metadata and storage paths
- Category classification and descriptions
- Upload tracking and access control

#### Real-time Data Flow:
**Socket.IO Events:**
- `new_message`: Real-time message delivery
- `user_typing`: Typing indicator updates
- `new_notification`: System notifications
- `call_user`: Video call initiation
- `user_online`: Online status updates

### Phase 6: Security & Data Protection

#### Authentication Security:
- JWT tokens with short expiration (15 minutes)
- Refresh token rotation
- Password hashing with bcrypt
- Route protection based on roles and verification status

#### Data Protection:
- File upload size limits (5MB)
- Email verification for mentees
- Admin approval for mentors
- Role-based access control throughout the system

---

## 🔄 Data Flow Summary

**Complete User Journey:**
1. **Registration** → Role-based verification process
2. **Authentication** → JWT-based security
3. **Core Activities** → Sessions, Chat, Resources, Announcements
4. **Real-time Communication** → Socket.IO messaging and video calls
5. **Administration** → User and system management
6. **Analytics** → Performance tracking and reporting

**Key Data Transformations:**
- Raw credentials → Hashed passwords
- File uploads → Database metadata + file system storage
- Session creation → Real-time notifications
- Message composition → Database persistence + real-time delivery
- User actions → Analytics data collection

This mentorship platform provides a comprehensive ecosystem for managing training programs, facilitating mentor-mentee relationships, and tracking educational progress through a secure, role-based architecture with real-time communication capabilities.
