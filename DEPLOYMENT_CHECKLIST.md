# Production Deployment Checklist

## ⚠️ CRITICAL: Production Server Needs Rebuild

The production server at `https://api.msmemagalang.shop` is currently running **old code** that doesn't include:
- `/api/routes` diagnostic endpoint
- `/api/analytics/recent-activity` route
- Updated file upload paths
- Enhanced error logging

## Deployment Steps

### 1. **SSH into Production Server**
```bash
ssh user@your-production-server
```

### 2. **Navigate to Backend Directory**
```bash
cd /path/to/backend
# or wherever your backend code is located
```

### 3. **Pull Latest Code** (if using Git)
```bash
git pull origin main
# or
git pull origin master
```

### 4. **Install Dependencies** (if package.json changed)
```bash
npm install
```

### 5. **Build TypeScript**
```bash
npm run build
```

This compiles `src/` to `dist/` directory.

### 6. **Verify Build Output**
```bash
# Check if routes file exists
ls -la dist/routes/analytics.js

# Check if server file exists
ls -la dist/server.js

# Verify the route is in compiled code
grep -r "recent-activity" dist/
```

### 7. **Restart Server**

**If using PM2:**
```bash
pm2 restart mentoring-backend
# or
pm2 restart all
```

**If using systemd:**
```bash
sudo systemctl restart your-service-name
```

**If using Docker:**
```bash
docker-compose restart backend
# or rebuild
docker-compose up -d --build backend
```

**If running directly:**
```bash
# Stop current process (Ctrl+C or kill process)
# Then start:
npm start
# or
node dist/server.js
```

### 8. **Verify Deployment**

**Check server logs:**
```bash
pm2 logs mentoring-backend
# or
tail -f /var/log/your-app.log
```

**Look for:**
- "Registered API Routes:" log message
- No errors on startup
- Server listening on correct port

**Test endpoints:**
```bash
# Health check
curl https://api.msmemagalang.shop/api/health

# Routes diagnostic (should work after deployment)
curl https://api.msmemagalang.shop/api/routes

# Recent activity (should work after deployment)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.msmemagalang.shop/api/analytics/recent-activity
```

## Quick One-Liner Deployment

If you have a deployment script:
```bash
cd backend && npm install && npm run build && pm2 restart mentoring-backend
```

## Common Issues

### Issue: Routes still return 404 after rebuild
**Solution:**
1. Check if build actually completed: `ls -la dist/`
2. Verify server restarted: `pm2 list`
3. Check server logs for errors: `pm2 logs`
4. Ensure `dist/server.js` exists and is being run

### Issue: "Cannot find module" errors
**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Issue: Port already in use
**Solution:**
```bash
# Find process using port 3001
lsof -i :3001
# or
netstat -tulpn | grep 3001

# Kill the process
kill -9 <PID>
```

## Environment Variables

Ensure these are set in production:
```bash
NODE_ENV=production
DATABASE_URL=your_production_database_url
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
PORT=3001
```

## Automated Deployment (Recommended)

Create a deployment script `deploy.sh`:
```bash
#!/bin/bash
set -e

echo "Deploying to production..."

cd /path/to/backend

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Restart server
pm2 restart mentoring-backend

echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

## Verification Checklist

After deployment, verify:

- [ ] Server starts without errors
- [ ] `/api/health` returns 200
- [ ] `/api/routes` returns list of routes (not 404)
- [ ] `/api/analytics/recent-activity` works (not 404)
- [ ] File uploads work (resources, avatars)
- [ ] Other existing routes still work
- [ ] Server logs show "Registered API Routes"

## Next Steps

Once deployed, the `/api/routes` endpoint will be available and you can use it to verify all routes are registered correctly.

