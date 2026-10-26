const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const env = require("./src/config/env");
const errorHandler = require("./src/middleware/errorHandler");

const { seedLocationsFromJson } = require("./src/utils/seedLocations");

// Connect to database
connectDB().then(() => {
  seedLocationsFromJson(false).catch((err) =>
    console.error("Initial location seed check failed:", err.message)
  );
});

const app = express();
// Middleware - CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from any origin in dev (web dashboard, mobile app, tools)
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
  })
);

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[BACKEND] Incoming Request: ${req.method} ${req.url}`);
  next();
});

// Need raw body for Paystack webhook
app.use((req, res, next) => {
  if (
    req.originalUrl === "/api/bills/verify" ||
    req.originalUrl === "/api/pickup/verify" ||
    req.originalUrl === "/api/paystack/webhook"
  ) {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json({ limit: "10mb" })(req, res, next);
  }
});

// Swagger
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./src/config/swagger");

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Routes
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/household", require("./src/routes/household"));
app.use("/api/zones", require("./src/routes/zone"));
app.use("/api/bills", require("./src/routes/bill"));
app.use("/api/routes", require("./src/routes/route"));
app.use("/api/driver", require("./src/routes/driver"));
app.use("/api/pickup", require("./src/routes/pickup"));
app.use("/api/admin", require("./src/routes/admin"));
app.use("/api/paystack", require("./src/routes/paystack"));
// New routes
app.use("/api/reports", require("./src/routes/reports"));
app.use("/api/assignments", require("./src/routes/assignments"));
app.use("/api/notifications", require("./src/routes/notifications"));
app.use("/api/schedules", require("./src/routes/schedules"));
app.use("/api/verification", require("./src/routes/verification"));
app.use("/api/availability", require("./src/routes/availability"));
app.use("/api/locations", require("./src/routes/location"));

app.get("/api/health", (req, res) => {
  console.log("Health check");
  res.json({ success: true, message: "Server is running normally" });
});

// Initialize Cron Jobs
require("./src/services/billingCron");

// Error handling middleware
app.use(errorHandler);

const http = require("http");
const { initTrackingServer } = require("./src/websocket/trackingServer");

const server = http.createServer(app);
initTrackingServer(server);

const PORT = env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`),
);
