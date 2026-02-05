# Deploy Full Stack to Render.com (Frontend + Backend)

## Architecture

```
┌──────────────────┐
│   Render          │
│   (Frontend +    │
│    Backend)       │
│                  │
│ rentalacar.onrender.com
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   PostgreSQL     │
│   (Free DB)      │
└──────────────────┘
```

## Step 1: Deploy to Render

### 1.1 Push Code to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin master
```

### 1.2 Create Web Service on Render

1. Go to https://dashboard.render.com
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `car-rental`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **"Create Web Service"**

### 1.3 Add Environment Variables

1. Click **"Environment"** tab
2. Add:
   - `DATABASE_URL` = (from your PostgreSQL database)
   - `ADMIN_PASSWORD` = `admin123`

### 1.4 Create PostgreSQL Database

1. Click **"New"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `car_rental`
   - **Instance type**: **Free**
   - **Storage**: **1 GB**
3. Click **"Create Database"**
4. Copy **Internal Database URL** and add to web service environment

### 1.5 Set Up Database Tables

Visit: `https://your-service-name.onrender.com/api/setup`

Expected response:
```json
{"success":true,"message":"Database setup complete! Tables created: cars, drivers, terms"}
```

### 1.6 Verify Backend

Visit: `https://your-service-name.onrender.com/api/cars`

Expected: `{"success":true,"data":[]}`

---

## URLs Summary

| Service | URL |
|---------|-----|
| Frontend | `https://your-service-name.onrender.com` |
| Admin Panel | `https://your-service-name.onrender.com/admin.html` |
| API | `https://your-service-name.onrender.com/api/cars` |
| Database Setup | `https://your-service-name.onrender.com/api/setup` |

---

## Adding Cars

1. Go to `https://your-service-name.onrender.com/admin.html`
2. Password: `admin123`
3. Click **"Add New Car"**
4. Fill in details and submit

---

## Troubleshooting

### "Frontend not found" error
- Make sure to use `npm start` as the start command (this builds the frontend first)
- If you see this error, visit `/api/setup` to build the database

### Page not found on refresh (e.g., /drivers)
- This should now work. The server serves the React app for all non-API routes.
- React Router handles the client-side routing.
