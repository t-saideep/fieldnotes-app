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
   * @returns {Promise<object>} The created entry object
   */
  static async create(rawText) {
    try {
      const result = await run("INSERT INTO entries (raw_text) VALUES (?)", [
        rawText,
      ]);
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
      return await get("SELECT * FROM entries WHERE id = ?", [id]);
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
      return await all(
        "SELECT * FROM entries ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [limit, offset]
      );
    } catch (error) {
      console.error("Error getting all entries:", error);
      throw error;
    }
  }

  /**
   * Get entries with specific tags
   * @param {Array<number>} tagIds - Array of tag IDs to filter by
   * @returns {Promise<Array>} Array of matching entry objects
   */
  static async getByTags(tagIds) {
    if (!tagIds || !tagIds.length) {
      return this.getAll();
    }

    try {
      // Create placeholders for the SQL query
      const placeholders = tagIds.map(() => "?").join(",");

      // Find entries that have ALL the specified tags (using GROUP BY and HAVING)
      return await all(
        `
        SELECT e.* 
        FROM entries e
        JOIN entry_tags et ON e.id = et.entry_id
        WHERE et.tag_id IN (${placeholders})
        GROUP BY e.id
        HAVING COUNT(DISTINCT et.tag_id) = ?
        ORDER BY e.created_at DESC
      `,
        [...tagIds, tagIds.length]
      );
    } catch (error) {
      console.error("Error getting entries by tags:", error);
      throw error;
    }
  }

  /**
   * Update an entry
   * @param {number} id - The entry ID
   * @param {string} rawText - The new raw text
   * @returns {Promise<object>} The updated entry
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
   * @param {number} id - The entry ID to delete
   * @returns {Promise<boolean>} Success indicator
   */
  static async delete(id) {
    try {
      const result = await run("DELETE FROM entries WHERE id = ?", [id]);
      return result.changes > 0;
    } catch (error) {
      console.error("Error deleting entry:", error);
      throw error;
    }
  }

  /**
   * Get all tags for an entry
   * @param {number} entryId - The entry ID
   * @returns {Promise<Array>} Array of tag objects with metadata
   */
  static async getTags(entryId) {
    try {
      return await all(
        `
        SELECT t.*, et.value, et.metadata
        FROM tags t
        JOIN entry_tags et ON t.id = et.tag_id
        WHERE et.entry_id = ?
      `,
        [entryId]
      );
    } catch (error) {
      console.error("Error getting tags for entry:", error);
      throw error;
    }
  }

  /**
   * Find entries by tag IDs
   * @param {Array<number>} tagIds - Array of tag IDs to filter by
   * @returns {Promise<Array>} Array of matching entry objects
   */
  static async findByTagIds(tagIds) {
    if (!tagIds || !tagIds.length) {
      return this.getAll();
    }

    try {
      // Create placeholders for the SQL query
      const placeholders = tagIds.map(() => "?").join(",");

      // Find entries that have ANY of the specified tags
      return await all(
        `
        SELECT DISTINCT e.* 
        FROM entries e
        JOIN entry_tags et ON e.id = et.entry_id
        WHERE et.tag_id IN (${placeholders})
        ORDER BY e.created_at DESC
      `,
        [...tagIds]
      );
    } catch (error) {
      console.error("Error finding entries by tag IDs:", error);
      throw error;
    }
  }
}

/**
 * Tag model - represents a tag for entries
 */
class Tag {
  /**
   * Create a new tag or get existing one
   * @param {string} name - The display name of the tag
   * @param {string} type - The tag type (person, place, etc.)
   * @param {string} normalizedName - The standardized name for searching
   * @returns {Promise<object>} The tag object
   */
  static async createOrGet(name, type, normalizedName) {
    try {
      // First try to get existing tag with same normalized name and type
      let tag = await get(
        "SELECT * FROM tags WHERE normalized_name = ? AND type = ?",
        [normalizedName, type]
      );

      // If not found, check if any tag with same normalized name exists (regardless of type)
      if (!tag) {
        const existingTags = await all(
          "SELECT * FROM tags WHERE normalized_name = ?",
          [normalizedName]
        );

        if (existingTags.length > 0) {
          // If we have matching tags, prioritize specific types over generic ones
          // Don't overwrite "place" with "entity", but do overwrite "entity" with "place"
          const typeHierarchy = {
            place: 10,
            person: 9,
            organization: 8,
            event: 7,
            object: 6,
            activity: 5,
            time: 4,
            quantity: 3,
            relation: 2,
            entity: 1,
            default: 0,
          };

          const newTypePriority = typeHierarchy[type] || 0;

          // Either use the existing tag if it has higher priority,
          // or update its type if the new type has higher priority
          const existingTag = existingTags[0];
          const existingTypePriority = typeHierarchy[existingTag.type] || 0;

          if (newTypePriority <= existingTypePriority) {
            // Use existing tag
            tag = existingTag;
          } else {
            // Update existing tag with more specific type
            await run("UPDATE tags SET type = ? WHERE id = ?", [
              type,
              existingTag.id,
            ]);
            tag = await get("SELECT * FROM tags WHERE id = ?", [
              existingTag.id,
            ]);
          }
        }
      }

      // If still no tag found, create a new one
      if (!tag) {
        const result = await run(
          "INSERT INTO tags (name, type, normalized_name) VALUES (?, ?, ?)",
          [name, type, normalizedName]
        );
        tag = await get("SELECT * FROM tags WHERE id = ?", [result.id]);
      }

      return tag;
    } catch (error) {
      console.error("Error creating/getting tag:", error);
      throw error;
    }
  }

  /**
   * Get a tag by ID
   * @param {number} id - The tag ID
   * @returns {Promise<object>} The tag object
   */
  static async getById(id) {
    try {
      return await get("SELECT * FROM tags WHERE id = ?", [id]);
    } catch (error) {
      console.error("Error getting tag:", error);
      throw error;
    }
  }

  /**
   * Get all tags
   * @param {string} type - Optional type filter
   * @returns {Promise<Array>} Array of tag objects
   */
  static async getAll(type = null) {
    try {
      if (type) {
        return await all("SELECT * FROM tags WHERE type = ?", [type]);
      }
      return await all("SELECT * FROM tags ORDER BY type, name");
    } catch (error) {
      console.error("Error getting all tags:", error);
      throw error;
    }
  }

  /**
   * Delete a tag
   * @param {number} id - The tag ID to delete
   * @returns {Promise<boolean>} Success indicator
   */
  static async delete(id) {
    try {
      const result = await run("DELETE FROM tags WHERE id = ?", [id]);
      return result.changes > 0;
    } catch (error) {
      console.error("Error deleting tag:", error);
      throw error;
    }
  }

  /**
   * Search for tags by name
   * @param {string} query - The search query
   * @returns {Promise<Array>} Array of matching tag objects
   */
  static async search(query) {
    try {
      // Normalize the query for better searching
      const normalizedQuery = query.toLowerCase();

      return await all(
        "SELECT * FROM tags WHERE LOWER(name) LIKE ? OR LOWER(normalized_name) LIKE ?",
        [`%${normalizedQuery}%`, `%${normalizedQuery}%`]
      );
    } catch (error) {
      console.error("Error searching tags:", error);
      throw error;
    }
  }

  /**
   * Find a tag by its normalized name
   * @param {string} normalizedName - The normalized name to search for
   * @returns {Promise<object|null>} The tag object or null if not found
   */
  static async findByName(normalizedName) {
    try {
      return await get("SELECT * FROM tags WHERE normalized_name = ?", [
        normalizedName,
      ]);
    } catch (error) {
      console.error("Error finding tag by name:", error);
      throw error;
    }
  }
}

/**
 * EntryTag model - handles the relationship between entries and tags
 */
class EntryTag {
  /**
   * Add a tag to an entry
   * @param {number} entryId - The entry ID
   * @param {number} tagId - The tag ID
   * @param {string} value - Optional value for the tag (e.g., time, quantity)
   * @param {object} metadata - Optional JSON metadata for the tag
   * @returns {Promise<boolean>} Success indicator
   */
  static async add(entryId, tagId, value = null, metadata = null) {
    try {
      // Convert metadata object to JSON string if provided
      const metadataStr = metadata ? JSON.stringify(metadata) : null;

      await run(
        "INSERT OR REPLACE INTO entry_tags (entry_id, tag_id, value, metadata) VALUES (?, ?, ?, ?)",
        [entryId, tagId, value, metadataStr]
      );
      return true;
    } catch (error) {
      console.error("Error adding tag to entry:", error);
      throw error;
    }
  }

  /**
   * Remove a tag from an entry
   * @param {number} entryId - The entry ID
   * @param {number} tagId - The tag ID
   * @returns {Promise<boolean>} Success indicator
   */
  static async remove(entryId, tagId) {
    try {
      const result = await run(
        "DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?",
        [entryId, tagId]
      );
      return result.changes > 0;
    } catch (error) {
      console.error("Error removing tag from entry:", error);
      throw error;
    }
  }

  /**
   * Get all entries for a specific tag
   * @param {number} tagId - The tag ID
   * @returns {Promise<Array>} Array of entry objects
   */
  static async getEntriesForTag(tagId) {
    try {
      return await all(
        `
        SELECT e.*
        FROM entries e
        JOIN entry_tags et ON e.id = et.entry_id
        WHERE et.tag_id = ?
        ORDER BY e.created_at DESC
      `,
        [tagId]
      );
    } catch (error) {
      console.error("Error getting entries for tag:", error);
      throw error;
    }
  }
}

module.exports = {
  Entry,
  Tag,
  EntryTag,
};
