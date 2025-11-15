import swaggerJsdoc from 'swagger-jsdoc';

const isProduction = process.env.NODE_ENV === 'production';
const apiUrl = process.env.API_URL || (isProduction ? 'https://www.msmemagalang.shop/api' : 'http://localhost:3001/api');

// Configure servers based on environment
const servers = isProduction
  ? [
      {
        url: apiUrl,
        description: 'Production server',
      },
    ]
  : [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
      {
        url: apiUrl,
        description: 'Custom API URL',
      },
    ];

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mentorship Management System API',
      version: '1.0.0',
      description: 'API documentation for the Mentorship & Training Management System',
      contact: {
        name: 'API Support',
        email: process.env.SUPPORT_EMAIL || 'support@example.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/login',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/**/*.ts', './dist/routes/**/*.js'],
};

export const specs = swaggerJsdoc(options);