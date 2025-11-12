# 🚀 Deployment Guide - Railway & Vercel

## 📋 Overview

This guide explains how to deploy the DigiAssistant application on Railway (backend) and Vercel (frontend).

## 🔧 Railway Backend Setup

### 1. Environment Variables

In your Railway project, set the following environment variables:

```
PORT=3001
MONGODB_URL=your_mongodb_connection_string
DATABASE_NAME=DigiAssistantDB
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=production
```

### 2. Railway Configuration

- **Build Command**: Railway will automatically detect `package.json` and run `npm install`
- **Start Command**: `npm start` (defined in `package.json`)
- **Root Directory**: `backend/`

### 3. MongoDB Setup

You can use:
- MongoDB Atlas (recommended for production)
- Railway's MongoDB service
- Any MongoDB instance

Make sure your MongoDB connection string is accessible from Railway's servers.

### 4. CORS Configuration

The backend is configured to allow requests from:
- `https://front-digiassistant.vercel.app` (production)
- All Vercel preview deployments matching `https://front-digiassistant*.vercel.app`
- Localhost (for development)

If you need to add more origins, edit `backend/server.js` and update the `allowedOrigins` array.

## 🌐 Vercel Frontend Setup

### 1. Environment Variables

In your Vercel project settings, add:

```
VITE_API_URL=https://your-railway-backend-url.up.railway.app
```

Replace `your-railway-backend-url` with your actual Railway backend URL.

### 2. Vercel Configuration

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Root Directory**: `frontend/`

### 3. Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set the root directory to `frontend/`
3. Add the `VITE_API_URL` environment variable
4. Deploy

## ✅ Verification Steps

### Backend (Railway)

1. Check that the server starts successfully
2. Visit `https://your-railway-url.up.railway.app/` - should see "DigiAssistant Backend is running!"
3. Check Railway logs for CORS configuration messages
4. Test the API endpoint: `https://your-railway-url.up.railway.app/api/auth/login`

### Frontend (Vercel)

1. Check that the build completes successfully
2. Visit your Vercel URL
3. Open browser console and check for CORS errors
4. Try logging in - should work without CORS errors

## 🐛 Troubleshooting

### CORS Errors

If you see CORS errors:

1. **Check Railway logs** - Look for CORS check messages:
   ```
   🔍 CORS Check - Origin received: "https://front-digiassistant.vercel.app"
   ✅ Origin allowed: https://front-digiassistant.vercel.app
   ```

2. **Verify origin in allowedOrigins** - Check `backend/server.js` line 14-26

3. **Check VITE_API_URL** - Make sure it matches your Railway backend URL exactly

4. **Clear browser cache** - Sometimes cached responses cause issues

### MongoDB Connection Issues

1. **Check MONGODB_URL** - Ensure it's correctly set in Railway
2. **Check network access** - MongoDB Atlas requires IP whitelisting
3. **Check Railway logs** - Look for MongoDB connection errors

### Build Failures

1. **Check Node.js version** - Railway should auto-detect, but verify in `package.json`
2. **Check dependencies** - Ensure all packages are in `package.json`
3. **Check build logs** - Look for specific error messages

## 📝 Notes

- Railway automatically assigns a URL like `backend-production-xxxx.up.railway.app`
- Vercel preview deployments use different URLs - the CORS config handles this with regex patterns
- Always test in production after deployment
- Monitor Railway logs for any issues

## 🔗 Useful Links

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

