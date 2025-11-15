# Mentorship & Training Management System

A comprehensive full-stack application for managing mentorship programs, training sessions, and educational resources. Built with React, TypeScript, Node.js, Express, and MySQL.

## 🚀 Features

- **Role-based Authentication**: Admin, Mentor, and Mentee roles with different permissions
- **Training Session Management**: Schedule, manage, and track training sessions
- **Real-time Chat**: Socket.io powered messaging system
- **Resource Library**: Upload and share training materials
- **Analytics Dashboard**: Track progress and performance metrics
- **Video Calling**: Built-in video conferencing capabilities
- **Notifications**: Real-time notifications for important updates
- **Email Verification**: Secure account verification system

## 🏗️ Architecture

```
├── frontend/          # React TypeScript frontend
├── backend/           # Node.js Express backend
└── README.md         # This file
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MySQL** (v8.0 or higher)
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mentorship-system
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/mentorship_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="development"

# File Upload
UPLOAD_DIR="uploads"
MAX_FILE_SIZE=5242880

# Email (for verification)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-email-password"

# Frontend URL
FRONTEND_URL="http://localhost:5173"
```

Set up the database:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

Start the backend server:

```bash
npm run dev
```

### 3. Frontend Setup

Open a new terminal and navigate to the project root:

```bash
npm install
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs

## 👥 Default User Roles

The system supports three user roles:

### Admin
- Full system access
- User management
- Session oversight
- System analytics

### Mentor
- Create and manage training sessions
- Upload resources
- Chat with mentees
- View mentee progress

### Mentee
- Join training sessions
- Access resources
- Chat with mentors
- Track personal progress

## 🔧 Development

### Backend Development

```bash
cd backend

# Start development server
npm run dev

# Start with ngrok (for external access)
npm run dev:ngrok

# Database commands
npm run db:generate    # Generate Prisma client
npm run db:push       # Push schema changes
npm run db:migrate    # Run migrations
npm run db:studio     # Open Prisma Studio
npm run db:truncate   # Clear all data

# Production build
npm run build
npm start
```

### Frontend Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📁 Project Structure

```
mentorship-system/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── routes/         # API routes
│   │   ├── config/         # Configuration files
│   │   ├── socket/         # Socket.io handlers
│   │   └── types/          # TypeScript types
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   └── uploads/            # File uploads
├── src/
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   └── types/             # TypeScript types
└── public/                # Static assets
```

## 🔐 Environment Variables

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | MySQL connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Yes |
| `EMAIL_USER` | SMTP email username | Yes |
| `EMAIL_PASS` | SMTP email password | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |

### Frontend (.env)

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

## 🚀 Deployment

### Backend Deployment

1. Build the application:
```bash
cd backend
npm run build
```

2. Set environment variables for production
3. Start with PM2:
```bash
npm run start:prod
```

### Frontend Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy the `dist` folder to your hosting service

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
npm test
```

## 📚 API Documentation

Once the backend is running, visit http://localhost:3001/api-docs to view the interactive API documentation powered by Swagger.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MySQL is running
   - Check DATABASE_URL in .env file
   - Verify database exists

2. **Email Verification Not Working**
   - Check EMAIL_USER and EMAIL_PASS in .env
   - Ensure "Less secure app access" is enabled for Gmail
   - Consider using App Passwords for Gmail

3. **Socket Connection Issues**
   - Verify VITE_SOCKET_URL matches backend URL
   - Check CORS configuration in backend

4. **File Upload Issues**
   - Ensure uploads directory exists and is writable
   - Check MAX_FILE_SIZE setting

### Getting Help

- Check the [Issues](../../issues) page for known problems
- Create a new issue if you encounter a bug
- Review the API documentation at `/api-docs`

## 🔄 Updates

To update the application:

```bash
git pull origin main
cd backend && npm install
npm install
npm run db:push  # Apply any database changes
```

---

**Happy Mentoring! 🎓**# 🚀 Complete Setup Guide

This guide will walk you through setting up the Mentorship & Training Management System from scratch.

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- [ ] **MySQL** (v8.0 or higher) - [Download here](https://dev.mysql.com/downloads/)
- [ ] **Git** - [Download here](https://git-scm.com/)
- [ ] **Code Editor** (VS Code recommended)
- [ ] **Gmail Account** (for email functionality)

## 🔧 Step-by-Step Setup

### Step 1: Clone and Navigate

```bash
# Clone the repository
git clone <repository-url>
cd mentorship-system
```

### Step 2: Database Setup

1. **Start MySQL Service**
   ```bash
   # On macOS with Homebrew
   brew services start mysql
   
   # On Ubuntu/Debian
   sudo systemctl start mysql
   
   # On Windows - Start MySQL from Services or MySQL Workbench
   ```

2. **Create Database**
   ```bash
   # Connect to MySQL
   mysql -u root -p
   
   # Create database
   CREATE DATABASE mentorship_db;
   
   # Create user (optional but recommended)
   CREATE USER 'mentorship_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON mentorship_db.* TO 'mentorship_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

### Step 3: Backend Setup

1. **Navigate to Backend**
   ```bash
   cd backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```

4. **Edit .env File**
   Open `backend/.env` and configure:

   ```env
   # Database - Update with your credentials
   DATABASE_URL="mysql://mentorship_user:your_password@localhost:3306/mentorship_db"
   
   # JWT Secrets - Generate strong secrets
   JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"
   JWT_REFRESH_SECRET="your-super-secret-refresh-key-at-least-32-characters-long"
   JWT_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   
   # Server
   PORT=3001
   NODE_ENV="development"
   
   # File Upload
   UPLOAD_DIR="uploads"
   MAX_FILE_SIZE=5242880
   
   # Email Configuration (Gmail)
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT=587
   EMAIL_USER="your-gmail@gmail.com"
   EMAIL_PASS="your-app-password"
   
   # Frontend URL
   FRONTEND_URL="http://localhost:5173"
   ```

5. **Gmail App Password Setup**
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification (enable if not already)
   - Security → App passwords
   - Generate password for "Mail"
   - Use this password in `EMAIL_PASS`

6. **Database Schema Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   ```

7. **Create Upload Directory**
   ```bash
   mkdir uploads
   ```

8. **Start Backend Server**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   Server running on port 3001
   API Documentation available at http://localhost:3001/api-docs
   ```

### Step 4: Frontend Setup

1. **Open New Terminal** (keep backend running)
   ```bash
   # Navigate to project root
   cd ..  # or open new terminal in project root
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create `.env` in project root:
   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   VITE_SOCKET_URL=http://localhost:3001
   ```

4. **Start Frontend Server**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   Local:   http://localhost:5173/
   Network: use --host to expose
   ```

### Step 5: Verify Installation

1. **Open Browser**
   - Navigate to http://localhost:5173
   - You should see the login page

2. **Test Registration**
   - Click "Sign up here"
   - Register as a Mentee
   - Check email for verification link

3. **API Documentation**
   - Visit http://localhost:3001/api-docs
   - Explore available endpoints

## 👥 Creating Test Users

### Method 1: Through UI
1. Register users through the frontend
2. Mentees: Verify email to activate
3. Mentors: Require admin approval

### Method 2: Direct Database (Development Only)
```sql
-- Connect to MySQL
mysql -u root -p mentorship_db

-- Create admin user
INSERT INTO users (id, name, email, role, status, passwordHash, verified) 
VALUES (
  'admin-1', 
  'System Admin', 
  'admin@example.com', 
  'ADMIN', 
  'ACTIVE', 
  '$2a$12$hash_here', -- Use bcrypt to hash 'admin123'
  true
);
```

## 🧪 Testing the System

### 1. Authentication Flow
- [ ] Register as Mentee
- [ ] Verify email
- [ ] Login successfully
- [ ] Register as Mentor
- [ ] Check pending approval status

### 2. Core Features
- [ ] Create training session (as Mentor/Admin)
- [ ] Upload resource
- [ ] Send chat message
- [ ] View dashboard analytics

### 3. Real-time Features
- [ ] Chat messaging
- [ ] Notifications
- [ ] Socket connection

## 🚨 Common Issues & Solutions

### Database Connection Error
```
Error: P1001: Can't reach database server
```
**Solution:**
- Ensure MySQL is running
- Check DATABASE_URL format
- Verify database exists
- Test connection: `mysql -u username -p database_name`

### Email Not Sending
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```
**Solution:**
- Use Gmail App Password, not regular password
- Enable 2-Factor Authentication first
- Check EMAIL_USER and EMAIL_PASS values

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Solution:**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port in .env
PORT=3002
```

### Frontend Can't Connect to Backend
```
Network Error / CORS Error
```
**Solution:**
- Ensure backend is running on port 3001
- Check VITE_API_BASE_URL in frontend .env
- Verify CORS configuration in backend

### File Upload Issues
```
Error: ENOENT: no such file or directory, open 'uploads/...'
```
**Solution:**
```bash
# Create uploads directory
mkdir backend/uploads
chmod 755 backend/uploads
```

## 🔄 Development Workflow

### Daily Development
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
npm run dev

# Terminal 3 - Database (optional)
npm run db:studio
```

### Database Changes
```bash
# After modifying schema.prisma
cd backend
npm run db:push

# For production migrations
npm run db:migrate
```

### Code Quality
```bash
# Lint frontend code
npm run lint

# Format code (if prettier configured)
npm run format
```

## 🚀 Production Deployment

### Backend Deployment
1. Set production environment variables
2. Build application: `npm run build`
3. Use PM2: `npm run start:prod`
4. Configure reverse proxy (nginx)
5. Enable HTTPS

### Frontend Deployment
1. Update API URLs for production
2. Build: `npm run build`
3. Deploy `dist` folder to hosting service
4. Configure routing for SPA

## 📞 Getting Help

If you encounter issues:

1. **Check Logs**
   - Backend: Console output
   - Frontend: Browser console
   - Database: MySQL error logs

2. **Common Commands**
   ```bash
   # Reset everything (development)
   cd backend
   npm run db:truncate
   npm run db:push
   
   # Clear node_modules
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Resources**
   - [Node.js Documentation](https://nodejs.org/docs/)
   - [Prisma Documentation](https://www.prisma.io/docs/)
   - [React Documentation](https://react.dev/)

---

**🎉 Congratulations! Your mentorship system should now be running successfully.**

Access your application at: http://localhost:5173