# Production 404 Route Issues - Fix Guide

## Problem
Some API routes return 404 in production but work locally. Example: `/api/analytics/recent-activity`

## Root Causes

### 1. **Build Not Updated** (Most Common)
The production server is running an old build that doesn't include the new routes.

**Solution:**
```bash
# In production server
cd backend
npm run build
pm2 restart mentoring-backend  # or your process manager command
```

### 2. **TypeScript Compilation Issues**
The route might not be included in the compiled output.

**Check:**
```bash
# Verify the route exists in compiled code
grep -r "recent-activity" backend/dist/
```

### 3. **Server Not Restarted**
After deploying new code, the server needs to be restarted.

**Solution:**
```bash
pm2 restart mentoring-backend
# or
systemctl restart your-service
```

### 4. **Route Registration Order**
The 404 handler might be catching requests before routes are registered.

**Fixed:** Routes are registered before the 404 handler in `server.ts`

## Diagnostic Steps

### Step 1: Check Registered Routes
Visit: `https://api.msmemagalang.shop/api/routes`

This will show all registered routes. If `/api/analytics/recent-activity` is missing, the build is outdated.

### Step 2: Check Server Logs
Look for route registration logs on server startup:
```
Registered API Routes:
  GET /api/analytics/recent-activity
  ...
```

### Step 3: Verify Build Output
```bash
# Check if route exists in compiled JavaScript
cat backend/dist/routes/analytics.js | grep recent-activity
```

### Step 4: Check File Structure
Ensure all route files are included in the build:
```bash
ls -la backend/dist/routes/
```

## Quick Fix Checklist

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Install dependencies (if needed):**
   ```bash
   npm install
   ```

3. **Build TypeScript:**
   ```bash
   npm run build
   ```

4. **Verify build output:**
   ```bash
   ls -la dist/routes/analytics.js
   ```

5. **Restart server:**
   ```bash
   pm2 restart mentoring-backend
   # or
   npm run start:prod
   ```

6. **Test the route:**
   ```bash
   curl https://api.msmemagalang.shop/api/routes
   ```

## Prevention

1. **Automate deployment:**
   - Add build step to deployment script
   - Always restart server after deployment

2. **Add health checks:**
   - Use `/api/health` endpoint
   - Monitor `/api/routes` for route count

3. **Version your API:**
   - Add version header to responses
   - Log build timestamp on startup

## Files Modified

- `backend/src/server.ts`: Added route logging and diagnostic endpoint
- Route registration verified in correct order

