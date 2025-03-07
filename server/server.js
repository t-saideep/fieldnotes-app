/**
 * Main server file for FieldNotes API
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// Import route handlers
const entriesRoutes = require("./routes/entries");
const tagsRoutes = require("./routes/tags");
const searchRoutes = require("./routes/search");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enhanced CORS configuration to allow requests from any origin on the local network
app.use(
  cors({
    origin: true, // Allow any origin
    credentials: true, // Allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use("/api/entries", entriesRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/search", searchRoutes);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, "../client/build")));

  // For any route not handled by the API, serve the React app
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build/index.html"));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down gracefully");
  // Close database connection and any other resources
  const { close } = require("./data/database");
  close()
    .then(() => {
      console.log("Database connection closed");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error closing database connection:", err);
      process.exit(1);
    });
});
