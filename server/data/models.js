/**
 * Database models for FieldNotes
 * Provides an OOP interface to the database tables
 */

const { run, get, all } = require("./database");

/**
 * Entry model - represents a note entry
 */
class Entry {
  /**
   * Create a new entry
   * @param {string} rawText - The raw text of the entry
   * @param {Float32Array|null} embedding - The vector embedding of the entry
   * @returns {Promise<object>} The created entry object
   */
  static async create(rawText, embedding = null) {
    try {
      let result;

      if (embedding) {
        try {
          // Store the embedding as a binary BLOB
          const embeddingBlob = Buffer.from(new Float32Array(embedding).buffer);
          result = await run(
            "INSERT INTO entries (raw_text, embedding) VALUES (?, ?)",
            [rawText, embeddingBlob]
          );
          console.log(`Added entry ${result.id} with embedding`);
        } catch (embeddingError) {
          console.warn(
            `Error storing embedding, falling back to text-only: ${embeddingError.message}`
          );
          result = await run("INSERT INTO entries (raw_text) VALUES (?)", [
            rawText,
          ]);
        }
      } else {
        result = await run("INSERT INTO entries (raw_text) VALUES (?)", [
          rawText,
        ]);
      }

      return this.getById(result.id);
    } catch (error) {
      console.error("Error creating entry:", error);
      throw error;
    }
  }

  /**
   * Get an entry by ID
   * @param {number} id - The entry ID
   * @returns {Promise<object>} The entry object
   */
  static async getById(id) {
    try {
      const entry = await get("SELECT * FROM entries WHERE id = ?", [id]);

      if (!entry) return null;

      // Ensure consistent date formatting in ISO format
      if (entry.created_at) {
        try {
          // Try to parse the date - if it's valid, convert to ISO string
          // If invalid, use current time
          const date = new Date(entry.created_at);
          entry.created_at = !isNaN(date.getTime())
            ? date.toISOString()
            : new Date().toISOString();
        } catch (e) {
          entry.created_at = new Date().toISOString();
        }
      } else {
        entry.created_at = new Date().toISOString();
      }

      if (entry.updated_at) {
        try {
          const date = new Date(entry.updated_at);
          entry.updated_at = !isNaN(date.getTime())
            ? date.toISOString()
            : new Date().toISOString();
        } catch (e) {
          entry.updated_at = new Date().toISOString();
        }
      } else {
        entry.updated_at = new Date().toISOString();
      }

      // Add empty tags array for backward compatibility
      entry.tags = [];

      return entry;
    } catch (error) {
      console.error("Error getting entry:", error);
      throw error;
    }
  }

  /**
   * Get all entries
   * @param {number} limit - Maximum number of entries to return
   * @param {number} offset - Number of entries to skip
   * @returns {Promise<Array>} Array of entry objects
   */
  static async getAll(limit = 100, offset = 0) {
    try {
      const entries = await all(
        "SELECT * FROM entries ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [limit, offset]
      );

      // Ensure consistent date formatting for all entries
      return entries.map((entry) => {
        // Format created_at
        if (entry.created_at) {
          try {
            const date = new Date(entry.created_at);
            entry.created_at = !isNaN(date.getTime())
              ? date.toISOString()
              : new Date().toISOString();
          } catch (e) {
            entry.created_at = new Date().toISOString();
          }
        } else {
          entry.created_at = new Date().toISOString();
        }

        // Format updated_at
        if (entry.updated_at) {
          try {
            const date = new Date(entry.updated_at);
            entry.updated_at = !isNaN(date.getTime())
              ? date.toISOString()
              : new Date().toISOString();
          } catch (e) {
            entry.updated_at = new Date().toISOString();
          }
        } else {
          entry.updated_at = new Date().toISOString();
        }

        // Add empty tags array for backward compatibility
        entry.tags = [];

        return entry;
      });
    } catch (error) {
      console.error("Error getting all entries:", error);
      throw error;
    }
  }

  /**
   * Update an entry
   * @param {number} id - The entry ID
   * @param {string} rawText - The new text content
   * @returns {Promise<object>} The updated entry object
   */
  static async update(id, rawText) {
    try {
      await run(
        "UPDATE entries SET raw_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [rawText, id]
      );
      return this.getById(id);
    } catch (error) {
      console.error("Error updating entry:", error);
      throw error;
    }
  }

  /**
   * Delete an entry
   * @param {number} id - The entry ID
   * @returns {Promise<boolean>} Success indicator
   */
  static async delete(id) {
    try {
      await run("DELETE FROM entries WHERE id = ?", [id]);
      return true;
    } catch (error) {
      console.error("Error deleting entry:", error);
      throw error;
    }
  }

  /**
   * Find entries by vector similarity or fallback to recent entries
   * @param {Float32Array|null} queryEmbedding - The query vector embedding (optional)
   * @param {number} limit - Maximum number of entries to return
   * @returns {Promise<Array>} Array of entry objects
   */
  static async findSimilar(queryEmbedding, limit = 5) {
    // When no vector search is available, fall back to recent entries
    console.log("Using fallback search with recent entries");
    const entries = await this.getAll(limit);

    // Ensure entries have proper date formatting
    return entries.map((entry) => ({
      ...entry,
      created_at: entry.created_at || new Date().toISOString(),
      updated_at: entry.updated_at || new Date().toISOString(),
      tags: [], // Add empty tags array for backward compatibility
    }));
  }
}

// Only export the Entry model now that we've removed tags
module.exports = {
  Entry,
};
