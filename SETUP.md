# 🚀 Complete Setup Guide

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