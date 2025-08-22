# Mentorship Backend

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

## Environment Setup

Make sure you have your `.env` file configured with:
- Database connection
- JWT secrets
- Other required environment variables

## API Documentation

Once running, visit:
- Local: http://localhost:3001/api-docs
- ngrok: https://your-ngrok-url.ngrok.io/api-docs

## Database Commands

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio