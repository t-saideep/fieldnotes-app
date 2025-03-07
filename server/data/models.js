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

  // Simple cache for recent search results to improve performance
  static similarityCache = {
    cache: new Map(),
    maxEntries: 20,

    get(queryHash) {
      return this.cache.get(queryHash);
    },

    set(queryHash, results) {
      // If cache is full, remove oldest entry
      if (this.cache.size >= this.maxEntries) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
      this.cache.set(queryHash, results);
    },
  };

  /**
   * Find entries by vector similarity or fallback to recent entries
   * @param {Float32Array|null} queryEmbedding - The query vector embedding (optional)
   * @param {number} limit - Maximum number of entries to return
   * @returns {Promise<Array>} Array of entry objects
   */
  static async findSimilar(queryEmbedding, limit = 5) {
    try {
      if (!queryEmbedding) {
        console.log("No embedding provided, falling back to recent entries");
        return await this.getAll(limit);
      }

      // Convert embedding Float32Array to standard JS array for easier handling
      const queryVector = Array.from(queryEmbedding);

      // Create a simple hash of the query for caching
      const queryHash = queryVector.slice(0, 10).join("|") + "|" + limit;

      // Check if we have cached results for this query
      const cachedResults = this.similarityCache.get(queryHash);
      if (cachedResults) {
        console.log("Using cached similarity search results");
        return cachedResults;
      }

      console.log("Using JavaScript similarity search");

      // Use pagination to avoid loading all entries at once
      const BATCH_SIZE = 25;
      let topMatches = [];
      let offset = 0;
      let hasMoreEntries = true;

      while (hasMoreEntries) {
        console.log(
          `Fetching batch of entries (offset: ${offset}, limit: ${BATCH_SIZE})...`
        );

        // Get entries with embeddings in batches
        const batchEntries = await all(
          "SELECT id, raw_text, embedding, created_at, updated_at FROM entries WHERE embedding IS NOT NULL ORDER BY id LIMIT ? OFFSET ?",
          [BATCH_SIZE, offset]
        );

        if (!batchEntries || batchEntries.length === 0) {
          hasMoreEntries = false;
          continue;
        }

        // Calculate similarity scores for this batch
        const batchWithScores = batchEntries
          .filter((entry) => entry.embedding) // Ensure embedding exists
          .map((entry) => {
            try {
              // Convert blob to Float32Array
              const buffer = entry.embedding;
              const entryEmbedding = new Float32Array(
                buffer.buffer,
                buffer.byteOffset,
                buffer.byteLength / 4
              );
              const entryVector = Array.from(entryEmbedding);

              // Calculate cosine similarity
              const dotProduct = queryVector.reduce(
                (sum, val, i) => sum + val * entryVector[i],
                0
              );
              const queryMagnitude = Math.sqrt(
                queryVector.reduce((sum, val) => sum + val * val, 0)
              );
              const entryMagnitude = Math.sqrt(
                entryVector.reduce((sum, val) => sum + val * val, 0)
              );

              const similarity = dotProduct / (queryMagnitude * entryMagnitude);

              return {
                ...entry,
                similarity,
              };
            } catch (error) {
              console.warn(
                `Error calculating similarity for entry ${entry.id}:`,
                error.message
              );
              return {
                ...entry,
                similarity: -1, // Mark as invalid with negative similarity
              };
            }
          })
          .filter((entry) => entry.similarity > -1); // Filter out entries with errors

        // Merge with top matches
        topMatches = [...topMatches, ...batchWithScores]
          .sort((a, b) => b.similarity - a.similarity) // Sort by similarity (descending)
          .slice(0, limit); // Keep only top N matches

        // Update offset for next batch
        offset += BATCH_SIZE;

        // If we have enough highly similar results or no more entries, stop processing
        if (
          topMatches.length === limit &&
          topMatches[limit - 1].similarity > 0.8
        ) {
          console.log(
            "Found highly similar entries, stopping batch processing"
          );
          hasMoreEntries = false;
        }

        // Set a reasonable limit for the number of batches (e.g., process at most 10 batches = 250 entries)
        if (offset >= BATCH_SIZE * 10) {
          console.log("Reached maximum number of batches, stopping processing");
          hasMoreEntries = false;
        }
      }

      if (topMatches.length > 0) {
        console.log(
          `Found ${topMatches.length} similar entries using JS similarity calculation`
        );

        // Process the results for consistent format
        const formattedResults = topMatches.map((entry) => ({
          id: entry.id,
          raw_text: entry.raw_text,
          created_at: entry.created_at || new Date().toISOString(),
          updated_at: entry.updated_at || new Date().toISOString(),
          tags: [], // Add empty tags array for backward compatibility
        }));

        // Cache the results
        this.similarityCache.set(queryHash, formattedResults);

        return formattedResults;
      }

      // If no similar entries found, fall back to recent entries
      console.log("No similar entries found, falling back to recent entries");
      const entries = await this.getAll(limit);

      // Ensure entries have proper date formatting
      return entries.map((entry) => ({
        ...entry,
        created_at: entry.created_at || new Date().toISOString(),
        updated_at: entry.updated_at || new Date().toISOString(),
        tags: [], // Add empty tags array for backward compatibility
      }));
    } catch (error) {
      console.error("Error in vector similarity search:", error);
      // Fall back to basic search
      console.log("Error occurred, falling back to recent entries");
      return await this.getAll(limit);
    }
  }

  /**
   * Update an entry's embedding
   * @param {number} id - The entry ID
   * @param {Float32Array} embedding - The vector embedding
   * @returns {Promise<boolean>} Success indicator
   */
  static async updateEmbedding(id, embedding) {
    try {
      if (!embedding) {
        console.warn("No embedding provided to updateEmbedding");
        return false;
      }

      // Convert the embedding to a binary buffer
      const embeddingBlob = Buffer.from(new Float32Array(embedding).buffer);

      // Update the embedding in the entries table
      await run(
        "UPDATE entries SET embedding = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [embeddingBlob, id]
      );

      console.log(`Updated vector embedding for entry ${id}`);

      // Clear the similarity cache when updating embeddings
      if (this.similarityCache && this.similarityCache.cache) {
        this.similarityCache.cache.clear();
        console.log("Cleared similarity cache after embedding update");
      }

      return true;
    } catch (error) {
      console.error("Error updating entry embedding:", error);
      throw error;
    }
  }
}

// Only export the Entry model now that we've removed tags
module.exports = {
  Entry,
};
