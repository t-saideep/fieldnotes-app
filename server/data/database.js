/**
 * Database module for FieldNotes
 * Handles SQLite database initialization and connection management
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Ensure data directory exists
const dataDir = path.join(__dirname, "..", "data-store");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dataDir, "fieldnotes.db");

// Try to load VSS configuration
let vssExtensionPath = "sqlite-vss";
try {
  const configPath = path.join(__dirname, "..", "vss-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (config.extensionPath) {
      vssExtensionPath = config.extensionPath;
      console.log(`Using VSS extension path from config: ${vssExtensionPath}`);
    }
  }
} catch (error) {
  console.warn("Error loading VSS config:", error.message);
}

// Create a database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
  } else {
    console.log("Connected to the SQLite database");
    initDatabase();
  }
});

/**
 * Initialize the database schema if it doesn't exist
 */
function initDatabase() {
  db.serialize(() => {
    // Enable foreign keys
    db.run("PRAGMA foreign_keys = ON");

    // Create Entries table
    db.run(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if embedding column exists and add it if it doesn't
    db.get("PRAGMA table_info(entries)", (err, rows) => {
      if (err) {
        console.error("Error checking table schema:", err);
        return;
      }

      // Look for embedding column
      const hasEmbeddingColumn =
        rows && rows.some && rows.some((row) => row.name === "embedding");

      if (!hasEmbeddingColumn) {
        console.log("Adding embedding column to entries table...");
        db.run("ALTER TABLE entries ADD COLUMN embedding BLOB", (err) => {
          if (err) {
            console.error("Error adding embedding column:", err);
          } else {
            console.log("Embedding column added successfully");
          }
        });
      }
    });

    // Create Tags table
    db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        UNIQUE(normalized_name, type)
      )
    `);

    // Create EntryTags table (junction table for many-to-many relationship)
    db.run(`
      CREATE TABLE IF NOT EXISTS entry_tags (
        entry_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        value TEXT,
        metadata TEXT,
        PRIMARY KEY (entry_id, tag_id),
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    console.log("Database schema initialized");
  });
}

/**
 * Run a query with parameters and return a Promise
 * @param {string} sql - SQL query string
 * @param {Array} params - Parameters for the query
 * @returns {Promise} - Resolves with result of the query
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error("Error running SQL:", sql);
        console.error(err);
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

/**
 * Get a single row from a query
 * @param {string} sql - SQL query string
 * @param {Array} params - Parameters for the query
 * @returns {Promise} - Resolves with the first row
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error("Error getting SQL:", sql);
        console.error(err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Get all rows from a query
 * @param {string} sql - SQL query string
 * @param {Array} params - Parameters for the query
 * @returns {Promise} - Resolves with all rows
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error("Error getting all SQL:", sql);
        console.error(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Close the database connection
 * @returns {Promise} - Resolves when connection is closed
 */
function close() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
        reject(err);
      } else {
        console.log("Database connection closed");
        resolve();
      }
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all,
  close,
};
