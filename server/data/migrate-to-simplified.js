/**
 * Simplified migration script to ensure database structure is correct
 */

const { Entry } = require("./models");
const { run, get, all } = require("./database");

async function migrateToSimplified() {
  console.log("Starting simplified migration...");

  try {
    // 1. Ensure the embedding column exists in entries table
    console.log("Checking entries table structure...");

    const tableInfo = await all("PRAGMA table_info(entries)");
    const hasEmbeddingColumn = tableInfo.some(
      (col) => col.name === "embedding"
    );

    if (!hasEmbeddingColumn) {
      console.log("Adding embedding column to entries table...");
      await run("ALTER TABLE entries ADD COLUMN embedding BLOB");
      console.log("Embedding column added successfully");
    } else {
      console.log("Embedding column already exists");
    }

    // 2. Count existing entries
    const result = await get("SELECT COUNT(*) as count FROM entries");
    const entryCount = result.count;
    console.log(`Found ${entryCount} existing entries`);

    console.log("Migration completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Make sure you have a valid OpenAI API key in server/.env");
    console.log("2. Restart your application with: npm start");
  } catch (error) {
    console.error("Error during migration:", error);
  }
}

// Execute the migration if this script is run directly
if (require.main === module) {
  migrateToSimplified()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateToSimplified };
