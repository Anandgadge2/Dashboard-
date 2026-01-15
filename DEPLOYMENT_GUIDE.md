# Vercel Deployment Guide - Dashboard Application

This guide will walk you through deploying both the **Backend** and **Frontend** to Vercel.

---

## Prerequisites

Before you begin, ensure you have:

1. ✅ A [Vercel account](https://vercel.com/signup) (free tier works)
2. ✅ [Node.js](https://nodejs.org/) installed (v18 or higher)
3. ✅ [Git](https://git-scm.com/) installed
4. ✅ Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

---

## Part 1: Deploy Backend API

### Step 1: Prepare Your Backend

1. **Navigate to backend directory:**

   ```bash
   cd c:\Users\anand\OneDrive\Desktop\Dashboard\backend
   ```

2. **Verify `vercel.json` exists:**

   - The file should already be created in your backend folder
   - It configures Vercel to deploy your Express/TypeScript API

3. **Check your entry point:**
   - Make sure you have `src/index.ts` or `src/server.ts`
   - Update `vercel.json` if your entry point is different

### Step 2: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 3: Login to Vercel

```bash
vercel login
```

Choose your preferred login method (GitHub, GitLab, Bitbucket, or Email).

### Step 4: Initialize Vercel Project

```bash
cd backend
vercel
```

You'll be asked several questions:

```
? Set up and deploy "~/Dashboard/backend"? [Y/n] Y
? Which scope do you want to deploy to? [Your Account]
? Link to existing project? [y/N] N
? What's your project's name? dashboard-backend
? In which directory is your code located? ./
```

**Important Settings:**

- Framework Preset: **Other**
- Build Command: `npm run build` or leave empty
- Output Directory: Leave empty (Vercel handles this)
- Development Command: Leave empty

### Step 5: Set Environment Variables

After the initial deployment, go to your Vercel dashboard or use CLI:

**Option A: Via Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Select your `dashboard-backend` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:

```
MONGODB_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
NODE_ENV=production

# WhatsApp Configuration
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_WEBHOOK_URL=https://your-backend-url.vercel.app/api/whatsapp/webhook

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Redis Configuration (Optional - use Upstash for serverless)
REDIS_URL=redis://your-redis-url
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# CORS Configuration
FRONTEND_URL=https://your-frontend-url.vercel.app
```

**Option B: Via CLI**

```bash
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
# ... add all other variables
```

### Step 6: Deploy to Production

```bash
vercel --prod
```

Your backend will be deployed! Note the URL (e.g., `https://dashboard-backend.vercel.app`)

---

## Part 2: Deploy Frontend (Next.js)

### Step 1: Update Frontend Configuration

1. **Navigate to frontend directory:**

   ```bash
   cd c:\Users\anand\OneDrive\Desktop\Dashboard\frontend
   ```

2. **Update API URL in your frontend:**

   Create or update `.env.production`:

   ```env
   NEXT_PUBLIC_API_URL=https://dashboard-backend.vercel.app
   ```

3. **Verify `next.config.js` (if exists):**

   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     reactStrictMode: true,
     env: {
       NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
     },
   };

   module.exports = nextConfig;
   ```

### Step 2: Initialize Frontend Deployment

```bash
cd frontend
vercel
```

Answer the prompts:

```
? Set up and deploy "~/Dashboard/frontend"? [Y/n] Y
? Which scope do you want to deploy to? [Your Account]
? Link to existing project? [y/N] N
? What's your project's name? dashboard-frontend
? In which directory is your code located? ./
```

**Vercel will auto-detect Next.js:**

- Framework Preset: **Next.js**
- Build Command: `npm run build` (auto-detected)
- Output Directory: `.next` (auto-detected)
- Development Command: `npm run dev` (auto-detected)

### Step 3: Set Frontend Environment Variables

**Via Vercel Dashboard:**

1. Go to https://vercel.com/dashboard
2. Select your `dashboard-frontend` project
3. Go to **Settings** → **Environment Variables**
4. Add:

```
NEXT_PUBLIC_API_URL=https://dashboard-backend.vercel.app
```

**Via CLI:**

```bash
vercel env add NEXT_PUBLIC_API_URL production
```

### Step 4: Deploy Frontend to Production

```bash
vercel --prod
```

Your frontend will be deployed! Note the URL (e.g., `https://dashboard-frontend.vercel.app`)

---

## Part 3: Update CORS and Webhook URLs

### Step 1: Update Backend CORS

1. Go to your backend Vercel project settings
2. Update `FRONTEND_URL` environment variable:

   ```
   FRONTEND_URL=https://dashboard-frontend.vercel.app
   ```

3. Redeploy backend:
   ```bash
   cd backend
   vercel --prod
   ```

### Step 2: Update WhatsApp Webhook URL

1. Update the `WHATSAPP_WEBHOOK_URL` in backend environment variables:

   ```
   WHATSAPP_WEBHOOK_URL=https://dashboard-backend.vercel.app/api/whatsapp/webhook
   ```

2. Update your WhatsApp Business API webhook configuration:
   - Go to Meta Developer Console
   - Navigate to WhatsApp → Configuration
   - Update Callback URL to: `https://dashboard-backend.vercel.app/api/whatsapp/webhook`
   - Use your `WHATSAPP_VERIFY_TOKEN` for verification

---

## Part 4: Database Setup (MongoDB Atlas)

If you haven't set up MongoDB Atlas yet:

### Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a free account
3. Create a new cluster (Free M0 tier)

### Step 2: Configure Database Access

1. Go to **Database Access** → **Add New Database User**
2. Create a user with password authentication
3. Note the username and password

### Step 3: Configure Network Access

1. Go to **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (0.0.0.0/0)
   - This is necessary for Vercel serverless functions

### Step 4: Get Connection String

1. Go to **Database** → **Connect** → **Connect your application**
2. Copy the connection string
3. Replace `<password>` with your database user password
4. Add this as `MONGODB_URI` in Vercel environment variables

---

## Part 5: Redis Setup (Optional - Upstash)

If you're using Redis:

### Step 1: Create Upstash Account

1. Go to https://upstash.com/
2. Create a free account
3. Create a new Redis database

### Step 2: Get Redis URL

1. Copy the Redis URL from Upstash dashboard
2. Add it as `REDIS_URL` in Vercel backend environment variables

---

## Part 6: Verify Deployment

### Backend Verification

1. **Test API endpoint:**

   ```bash
   curl https://dashboard-backend.vercel.app/api/health
   ```

2. **Check logs:**
   ```bash
   vercel logs dashboard-backend
   ```

### Frontend Verification

1. **Visit your frontend URL:**

   ```
   https://dashboard-frontend.vercel.app
   ```

2. **Test login and functionality**

3. **Check browser console for errors**

---

## Part 7: Continuous Deployment (Optional)

### Connect to Git Repository

1. **Push your code to GitHub:**

   ```bash
   cd c:\Users\anand\OneDrive\Desktop\Dashboard
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/dashboard.git
   git push -u origin main
   ```

2. **Link Vercel to GitHub:**
   - Go to Vercel Dashboard
   - Click **Import Project**
   - Select your GitHub repository
   - Vercel will auto-deploy on every push to main branch

---

## Troubleshooting

### Common Issues

**1. Backend API not responding:**

- Check Vercel logs: `vercel logs dashboard-backend`
- Verify environment variables are set correctly
- Check MongoDB connection string

**2. CORS errors:**

- Ensure `FRONTEND_URL` is set correctly in backend
- Verify CORS configuration in your Express app

**3. Build failures:**

- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure TypeScript compiles without errors locally

**4. Environment variables not working:**

- Redeploy after adding environment variables
- Use `NEXT_PUBLIC_` prefix for frontend variables
- Don't use `NEXT_PUBLIC_` for backend variables

**5. MongoDB connection timeout:**

- Verify Network Access allows 0.0.0.0/0
- Check connection string format
- Ensure database user has correct permissions

### Useful Commands

```bash
# View deployment logs
vercel logs

# List all deployments
vercel list

# Remove a deployment
vercel remove [deployment-url]

# View environment variables
vercel env ls

# Pull environment variables locally
vercel env pull

# Redeploy without changes
vercel --prod --force
```

---

## Production Checklist

Before going live:

- [ ] All environment variables are set
- [ ] MongoDB Atlas is configured with proper access
- [ ] WhatsApp webhook URL is updated
- [ ] CORS is configured correctly
- [ ] Frontend API URL points to production backend
- [ ] Test all major features (login, grievances, appointments)
- [ ] Check all API endpoints work
- [ ] Verify WhatsApp chatbot functionality
- [ ] Test file uploads (Cloudinary)
- [ ] Monitor Vercel logs for errors
- [ ] Set up custom domain (optional)

---

## Custom Domain Setup (Optional)

### Add Custom Domain

1. Go to your Vercel project
2. Click **Settings** → **Domains**
3. Add your custom domain
4. Follow DNS configuration instructions
5. Wait for DNS propagation (can take up to 48 hours)

**Example:**

- Backend: `api.yourdomain.com`
- Frontend: `yourdomain.com` or `app.yourdomain.com`

---

## Support Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Next.js Documentation:** https://nextjs.org/docs
- **MongoDB Atlas Documentation:** https://docs.atlas.mongodb.com/
- **Vercel Community:** https://github.com/vercel/vercel/discussions

---

## Quick Reference

### Backend Deployment

```bash
cd backend
vercel --prod
```

### Frontend Deployment

```bash
cd frontend
vercel --prod
```

### View Logs

```bash
vercel logs [project-name]
```

### Environment Variables

```bash
vercel env add [VARIABLE_NAME] production
```

---

**Deployment Complete! 🎉**

Your Dashboard application is now live on Vercel!

- **Backend:** https://dashboard-backend.vercel.app
- **Frontend:** https://dashboard-frontend.vercel.app
