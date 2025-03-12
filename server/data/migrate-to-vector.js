/**
 * Migration script to add vector embeddings to existing entries
 * Run this script after upgrading to the vector-based search
 */

const { Entry } = require("./models");
const { generateEmbedding } = require("../llm/llm");
const { all, run } = require("./database");

async function migrateToVectorSearch() {
  console.log("Starting migration to vector-based search...");

  try {
    // Get all entries
    const entries = await all("SELECT id, raw_text FROM entries");
    console.log(`Found ${entries.length} entries to process`);

    // Process each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      try {
        console.log(
          `Processing entry ${i + 1}/${entries.length} (ID: ${entry.id})...`
        );

        // Generate embedding
        const embedding = await generateEmbedding(entry.raw_text);

        // Update the entry with the embedding
        await Entry.updateEmbedding(entry.id, embedding);

        console.log(`Successfully updated entry ${entry.id} with embedding`);
      } catch (error) {
        console.error(`Error processing entry ${entry.id}:`, error);
        // Continue with next entry
      }

      // Small delay to avoid rate limiting
      if (i < entries.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("Migration completed successfully!");
    console.log(
      "Note: The tags and entry_tags tables can now be safely removed if desired."
    );

    // Print usage instructions
    console.log(
      "\nTo remove tag-related tables after confirming everything works:"
    );
    console.log("1. sqlite3 data-store/fieldnotes.db");
    console.log("2. DROP TABLE entry_tags;");
    console.log("3. DROP TABLE tags;");
    console.log("4. .exit");
  } catch (error) {
    console.error("Error during migration:", error);
  }
}

// Execute the migration if this script is run directly
if (require.main === module) {
  migrateToVectorSearch()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateToVectorSearch };
