# Production API Issues - Common Causes & Fixes

## Issues Fixed

### 1. **File Upload Path Issues** ✅ FIXED
**Problem:** Using relative paths (`'uploads/'`) in multer configuration causes failures in production where the working directory may differ.

**Solution:**
- Changed all multer storage configurations to use absolute paths: `path.join(process.cwd(), 'uploads')`
- Added directory creation checks before multer initialization
- Added filename sanitization for security

**Files Fixed:**
- `backend/src/routes/resources.ts`
- `backend/src/routes/users.ts`
- `backend/src/routes/auth.ts`

### 2. **Error Logging** ✅ FIXED
**Problem:** Insufficient error details in production make debugging difficult.

**Solution:**
- Enhanced error logging in `backend/src/server.ts` and `backend/src/controllers/resourceController.ts`
- Added detailed error information (message, stack, code, path)
- Logs request URL and method for context

### 3. **Uploads Directory** ✅ FIXED
**Problem:** Uploads directory might not exist in production.

**Solution:**
- Added directory existence checks and automatic creation
- Uses `fs.mkdirSync(uploadsDir, { recursive: true })` to ensure directory exists

## Other Common Production Issues to Check

### 4. **Environment Variables**
Ensure these are set in your production environment:
```bash
NODE_ENV=production
DATABASE_URL=your_production_database_url
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
PORT=3001
MAX_FILE_SIZE=5242880
FRONTEND_URL=https://www.msmemagalang.shop
API_URL=https://api.msmemagalang.shop/api
```

### 5. **Database Connection**
- Verify `DATABASE_URL` is correctly set
- Ensure database is accessible from production server
- Check Prisma migrations are run: `npx prisma migrate deploy`

### 6. **File Permissions**
Ensure the uploads directory has write permissions:
```bash
chmod 755 uploads/
```

### 7. **CORS Configuration**
Already configured in `server.ts`, but verify:
- Production origin is in `allowedOrigins` array
- CORS credentials are enabled

### 8. **Build & Dependencies**
- Ensure all dependencies are installed: `npm install`
- Build TypeScript: `npm run build`
- Check for missing native dependencies

### 9. **Process Manager**
Use PM2 or similar to ensure server restarts on crashes:
```bash
pm2 start dist/server.js --name mentorhub-api
```

## Debugging Steps

1. **Check Server Logs:**
   - Look for detailed error messages in production logs
   - Check for file system errors
   - Verify database connection errors

2. **Test File Uploads:**
   - Verify uploads directory exists and is writable
   - Check file size limits
   - Test with different file types

3. **Verify Environment:**
   - Confirm all environment variables are set
   - Check `NODE_ENV` is set to `production`
   - Verify API base URLs match production domains

4. **Database:**
   - Run `npx prisma migrate deploy` in production
   - Verify database connection string
   - Check database user permissions

## Quick Checklist

- [x] File upload paths use absolute paths
- [x] Uploads directory is created automatically
- [x] Error logging is enhanced
- [ ] Environment variables are set
- [ ] Database migrations are deployed
- [ ] File permissions are correct
- [ ] CORS is properly configured
- [ ] Server is running with process manager

