# Deploy to Render.com - Step by Step

## What is Render?
Render offers **free PostgreSQL database** and **free Node.js web service**.

## Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Ready for Render"
# Create repository on GitHub.com
git remote add origin https://github.com/YOUR_USERNAME/car-rental.git
git push -u origin main
```

## Step 2: Create PostgreSQL Database on Render

1. Go to https://dashboard.render.com
2. Click **"New"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `car-rental-db`
   - **Database**: `car_rental`
   - **User**: `postgres`
4. Click **"Create Database"**
5. **IMPORTANT**: Copy the "Internal Database URL" - you'll need it later
   - Format: `postgres://user:password@host:5432/car_rental`

## Step 3: Deploy Backend on Render

1. Go to https://dashboard.render.com
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `car-rental-api`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **"Create Web Service"**

## Step 4: Add Environment Variables

1. In your web service dashboard, click **"Environment"** tab
2. Add these variables:
   ```
   DATABASE_URL=postgres://user:password@host:5432/car_rental
   ADMIN_PASSWORD=admin123
   ```
3. **IMPORTANT**: Copy the "Internal Database URL" from Step 2 and paste it as `DATABASE_URL`

## Step 5: Set Up Database Tables

1. In PostgreSQL dashboard, click **"PSQL"** button
2. Copy content from `config/schema.sql` and paste into the PSQL console
3. Press **Enter** to execute

## Step 6: Deploy Frontend on Netlify (Free)

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Go to https://netlify.com and drag the `dist` folder to deploy

3. **Update API URL**:
   - Edit `src/pages/CarsPage.jsx`:
   ```javascript
   const API_BASE = 'https://your-render-service.onrender.com'
   ```
   - Rebuild and redeploy

## Environment Variables for Render

In Render dashboard, add:

| Variable | Value |
|----------|-------|
| DATABASE_URL | `postgres://...` (from Step 2) |
| ADMIN_PASSWORD | `admin123` (or your choice) |

## If Using MySQL Instead

If you prefer MySQL (not free on Render), use:
- **FreeMySQLHosting.net** - Free MySQL hosting
- **Remotemysql.com** - Free MySQL

Then update `config/database.js` to use mysql2 instead of pg.

## Testing Your Deployment

1. API: `https://your-render-service.onrender.com/api/cars`
2. Frontend: `https://your-netlify-site.netlify.app`
3. Admin: `https://your-netlify-site.netlify.app/admin.html`

## Troubleshooting

### "Connection refused"
- Check DATABASE_URL is correct
- Make sure database is awake (Render puts free databases to sleep after 90 minutes)

### "Database does not exist"
- Make sure you ran the SQL schema in PSQL console

### "Module not found: pg"
- Run `npm install` locally and commit
