# AkureClean - Smart Municipal Waste Collection System Backend

This is the backend for AkureClean, a smart municipal waste collection system tailored for Akure, Nigeria. It is built using Node.js, Express.js, MongoDB (Mongoose), and integrates with Paystack for payments, OSRM for route optimization, and Expo for push notifications.

## Tech Stack
- Node.js & Express.js
- MongoDB & Mongoose
- JWT Authentication (Access + Refresh Tokens)
- Paystack API for Payments
- OSRM API for Distance Matrix and Route Optimization
- Expo Server SDK for Push Notifications
- Node-cron for Automated Billing

## Setup Instructions

1. **Clone the repository and install dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root of the `server` directory and add the necessary environment variables. You can copy the provided `.env.example` file.
   ```bash
   cp .env.example .env
   ```
   **Required variables:**
   - `PORT`: The port the server will run on (e.g., 5000)
   - `MONGODB_URI`: Connection string for MongoDB
   - `JWT_ACCESS_SECRET`: Secret for signing access tokens
   - `JWT_REFRESH_SECRET`: Secret for signing refresh tokens
   - `PAYSTACK_SECRET_KEY`: Your Paystack secret key
   - `NODE_ENV`: Set to `development` or `production`

3. **Running the Application**
   - For development (using nodemon):
     ```bash
     npm run dev
     ```
   - For production:
     ```bash
     node index.js
     ```
   Note: To use `npm run dev`, you need to add `"dev": "nodemon index.js"` to the `scripts` section of `package.json`.

## API Endpoints Overview

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get tokens
- `POST /api/auth/refresh` - Get a new access token using a refresh token
- `POST /api/household` - Create a household (Residents)
- `POST /api/zones` - Create a new zone (Admin)
- `GET /api/bills/mine` - View user bills (Residents)
- `POST /api/bills/pay` - Initiate Paystack payment for bill
- `POST /api/routes/generate/:zoneId` - Generate optimized route for a zone (Admin)
- `GET /api/driver/route` - Get today's active route (Driver)
- `POST /api/pickup` - Request an extra pickup (Residents)
- `GET /api/admin/logs` - View all collection logs (Admin)

## Features
- **Route Optimization**: Uses OSRM distance matrix and Nearest-Neighbor algorithm to optimize driver routes starting from the central depot.
- **Automated Billing**: A cron job generates an annual bill for all registered residents on January 1st every year.
- **Push Notifications**: Sends Expo push notifications to residents when a route is generated or their pickup request is accepted.
- **Secure Webhooks**: Paystack webhooks are secured using HMAC SHA512 signature validation.
