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

**Happy Mentoring! 🎓**