/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';

import { specs } from './config/swagger';
import { setupChatHandlers } from './socket/chatHandler';
import { setIO } from './utils/socket';

// Route imports
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import sessionRoutes from './routes/sessions';
import announcementRoutes from './routes/announcements';
import resourceRoutes from './routes/resources';
import analyticsRoutes from './routes/analytics';
import ratingsRoutes from './routes/ratings';
import messageRoutes from './routes/message';
import notificationRoutes from './routes/notifications';
import listEndpoints from 'express-list-endpoints';

// Ensure uploads directory exists (use process.cwd() for production compatibility)
// In production, __dirname points to dist/, so we need to go up to project root
const uploadsDir = process.env.NODE_ENV === 'production' 
  ? path.join(process.cwd(), 'uploads')
  : path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

const app = express();
const server = createServer(app);

// Log all registered routes on startup (useful for debugging)
if (process.env.NODE_ENV === 'development' || process.env.LOG_ROUTES === 'true') {
  const endpoints = listEndpoints(app);
  console.log('Registered API Routes:');
  endpoints.forEach((endpoint: any) => {
    endpoint.methods.forEach((method: string) => {
      console.log(`  ${method} ${endpoint.path}`);
    });
  });
}
// CORS configuration
const allowedOrigins = [
  'https://www.msmemagalang.shop',
  'https://msmemagalang.shop',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://fb82b6f9b443.ngrok-free.app',
  'https://03e3a8c36953.ngrok-free.app'
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, check against allowed list; in development, allow all
    if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Accept all origins for now to fix production issue
      // TODO: Change to callback(null, false) for stricter security
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Explicit OPTIONS handler as fallback for preflight requests
app.options('*', cors(corsOptions));

// Socket.IO setup - CORS configuration for Socket.IO
const socketCorsOrigins = [
  'https://www.msmemagalang.shop',
  'https://msmemagalang.shop',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://fb82b6f9b443.ngrok-free.app',
  'https://03e3a8c36953.ngrok-free.app'
];

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? socketCorsOrigins 
      : true, // Allow all in development
    credentials: true,
    methods: ["GET", "POST"]
  }
});

// Setup chat handlers
setupChatHandlers(io);

// Set io instance for use in controllers
setIO(io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (use same path logic as uploadsDir)
const staticUploadsDir = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'uploads')
  : path.join(__dirname, '../uploads');
app.use('/uploads', express.static(staticUploadsDir));
console.log('Serving static files from:', staticUploadsDir);

// API Documentation - Always enabled
const isProduction = process.env.NODE_ENV === 'production';

// Basic auth middleware for Swagger protection in production
const swaggerAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!isProduction || (!process.env.SWAGGER_USERNAME || !process.env.SWAGGER_PASSWORD)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger API Documentation"');
    return res.status(401).send('Authentication required');
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  if (username === process.env.SWAGGER_USERNAME && password === process.env.SWAGGER_PASSWORD) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Swagger API Documentation"');
  return res.status(401).send('Invalid credentials');
};

app.use(
  '/api-docs',
  swaggerAuth,
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customCss: isProduction ? '.swagger-ui .topbar { display: none }' : undefined,
    customSiteTitle: 'Mentorship Management System API',
    customfavIcon: '/favicon.ico',
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Mentorship Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// Route diagnostics endpoint (for debugging production issues)
app.get('/api/routes', (req, res) => {
  const endpoints = listEndpoints(app);
  const routes = endpoints.map((endpoint: any) => ({
    path: endpoint.path,
    methods: endpoint.methods
  }));
  res.json({ 
    success: true, 
    routes,
    count: routes.length,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  console.error('Error stack:', error.stack);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);
  
  // Log more details in production for debugging
  if (process.env.NODE_ENV === 'production') {
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      path: error.path
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      error: error.message,
      stack: error.stack 
    })
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});

export default app;