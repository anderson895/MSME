# Mentorship Backend

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/mentorship_db"

# JWT Secrets (Generate strong secrets for production)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server Configuration
PORT=3001
NODE_ENV="development"

# File Upload Settings
UPLOAD_DIR="uploads"
MAX_FILE_SIZE=5242880  # 5MB in bytes

# Email Configuration (Gmail example)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"  # Use App Password for Gmail

# Frontend URL (for CORS and email links)
FRONTEND_URL="http://localhost:5173"
```

3. **Database Setup**

Create a MySQL database:
```sql
CREATE DATABASE mentorship_db;
```

Generate Prisma client and push schema:
```bash
npm run db:generate
npm run db:push
```

4. **Create Upload Directory**
```bash
mkdir uploads
```

### Running the Application

## Development with ngrok

To run the backend with ngrok tunneling for external access:

```bash
npm run dev:ngrok
```

This will:
1. Start the backend server on port 3001
2. Create an ngrok tunnel to expose it publicly
3. Display the public URL in the terminal

## Regular Development

To run just the backend server locally:

```bash
npm run dev
```

### Production Deployment

```bash
# Build the application
npm run build

# Start with PM2 (recommended for production)
npm run start:prod

# Or start directly
npm start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/        # Route handlers
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   ├── sessionController.ts
│   │   └── ...
│   ├── middleware/         # Custom middleware
│   │   └── auth.ts
│   ├── routes/            # API routes
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   └── ...
│   ├── config/            # Configuration
│   │   ├── database.ts
│   │   ├── email.ts
│   │   └── swagger.ts
│   ├── socket/            # Socket.io handlers
│   │   └── chatHandler.ts
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   └── server.ts          # Main server file
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── scripts/               # Utility scripts
├── uploads/               # File uploads (created at runtime)
└── package.json
```

## API Documentation

Once running, visit:
- Local: http://localhost:3001/api-docs
- ngrok: https://your-ngrok-url.ngrok.io/api-docs

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run dev:ngrok` | Start dev server with ngrok tunnel |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run start:prod` | Build and start with PM2 |

## Database Commands

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:truncate` - Clear all data (development only)

## 🔐 Authentication & Authorization

The system uses JWT-based authentication with role-based access control:

### Roles
- **ADMIN**: Full system access
- **MENTOR**: Can create sessions, upload resources, manage mentees
- **MENTEE**: Can join sessions, access resources, track progress

### Authentication Flow
1. User registers with email/password
2. Mentees receive email verification
3. Mentors require admin approval
4. JWT tokens issued upon successful login
5. Refresh tokens for session management

## 📧 Email Configuration

### Gmail Setup
1. Enable 2-Factor Authentication
2. Generate App Password
3. Use App Password in `EMAIL_PASS`

### Other SMTP Providers
Update `EMAIL_HOST` and `EMAIL_PORT` accordingly:
- **Outlook**: smtp-mail.outlook.com:587
- **Yahoo**: smtp.mail.yahoo.com:587
- **Custom SMTP**: Your provider's settings

## 🗄️ Database Schema

Key entities:
- **Users**: Authentication and profile data
- **Sessions**: Training sessions with mentor-mentee relationships
- **Resources**: File uploads and learning materials
- **Messages**: Chat system with direct and group messaging
- **Notifications**: System notifications
- **Ratings**: Mentor feedback system

## 🔌 Socket.io Events

Real-time features powered by Socket.io:

### Chat Events
- `send_message`: Send chat message
- `new_message`: Receive new message
- `typing_start/stop`: Typing indicators

### Video Call Events
- `call_user`: Initiate video call
- `answer_call`: Accept video call
- `ice_candidate`: WebRTC signaling
- `end_call`: Terminate call

## 🚨 Error Handling

The API uses consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## 🔧 Troubleshooting

### Database Issues
```bash
# Reset database (development only)
npm run db:truncate
npm run db:push
```

### File Upload Issues
```bash
# Ensure uploads directory exists and is writable
mkdir uploads
chmod 755 uploads
```

### Email Issues
- Check SMTP credentials
- Verify firewall settings
- Test with a simple SMTP client

## 🔒 Security Considerations

- Use strong JWT secrets (32+ characters)
- Enable HTTPS in production
- Configure proper CORS origins
- Validate all user inputs
- Sanitize file uploads
- Use environment variables for secrets
- Regular security updates