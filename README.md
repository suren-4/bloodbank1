# Blood Bank Management System

A comprehensive system for managing blood donations, inventory, and requests.

## Features

- User authentication and registration
- Donor management
- Blood inventory tracking
- Blood request system
- Donation camp scheduling
- Admin dashboard

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MySQL

## Deployment on Railway

Railway provides an easy way to deploy both your backend and MySQL database together.

### Prerequisites

- GitHub account
- Railway account (can sign up with GitHub)

### Steps to Deploy on Railway

1. **Push Your Project to GitHub**
   - Make sure your complete project is in a GitHub repository

2. **Deploy the MySQL Database**
   - Log in to [Railway](https://railway.app/)
   - Click "New Project" → "Database" → "MySQL"
   - Once created, it will generate environment variables:
     - `MYSQLHOST`
     - `MYSQLUSER`
     - `MYSQLPASSWORD`
     - `MYSQLPORT`
     - `MYSQLDATABASE`

3. **Deploy the Backend**
   - In your Railway dashboard, click "New" → "GitHub Repo"
   - Find and select your repository
   - Configure the service:
     - Root Directory: `backend` (if your backend is in a subdirectory)
     - Start Command: `npm start`
   - Add additional environment variables:
     - `JWT_SECRET`: A secure random string
     - `NODE_ENV`: production

4. **Deploy the Frontend (Static Site)**
   - In Railway, click "New" → "GitHub Repo" again
   - Select the same repository
   - Configure the service:
     - Root Directory: `frontend` (if your frontend is in a subdirectory)
     - Start Command: `npx serve -s .` (to serve static files)
   - Add environment variables:
     - `API_URL`: URL of your deployed backend (from Railway)

5. **Update Frontend API URL**
   - After backend deployment, get the generated URL from Railway
   - Run the utility script to update API URLs in your frontend files:
     ```
     cd frontend
     node update-api-url.js
     ```
   - Push changes to GitHub, and Railway will automatically redeploy

6. **Set Up Custom Domain (Optional)**
   - In Railway dashboard, go to your frontend service
   - Click "Settings" → "Custom Domain"
   - Follow instructions to add your domain

### Using Railway CLI (Alternative Approach)

1. **Install Railway CLI**
   ```
   npm install -g @railway/cli
   ```

2. **Login and Initialize**
   ```
   railway login
   railway init
   ```

3. **Link to Existing Project**
   ```
   railway link
   ```

4. **Deploy Your Project**
   ```
   railway up
   ```

## Local Development

1. Clone the repository
2. Navigate to the backend directory and install dependencies:
   ```
   cd backend
   npm install
   ```
3. Create a `.env` file based on `.env.example` with your local configuration
4. Start the backend server:
   ```
   npm run dev
   ```
5. Open the frontend files in your browser or use a simple HTTP server 