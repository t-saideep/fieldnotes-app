/**
 * Routes for managing tags
 */

const express = require("express");
const router = express.Router();
const { Tag, EntryTag } = require("../data/models");
const { all } = require("../data/database");

/**
 * GET /api/tags
 * Get all tags, optionally filtered by type, with entry counts
 */
router.get("/", async (req, res) => {
  try {
    const { type } = req.query;
    const tags = await Tag.getAll(type || null);

    // Get entry count for each tag
    const tagsWithCounts = await Promise.all(
      tags.map(async (tag) => {
        try {
          const entries = await EntryTag.getEntriesForTag(tag.id);
          return {
            ...tag,
            count: entries.length,
          };
        } catch (error) {
          console.error(`Error getting entries for tag ${tag.id}:`, error);
          return {
            ...tag,
            count: 0,
          };
        }
      })
    );

    res.json(tagsWithCounts);
  } catch (error) {
    console.error("Error getting tags:", error);
    res.status(500).json({ error: "Failed to retrieve tags" });
  }
});

/**
 * GET /api/tags/:id
 * Get a specific tag by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const tag = await Tag.getById(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    res.json(tag);
  } catch (error) {
    console.error("Error getting tag:", error);
    res.status(500).json({ error: "Failed to retrieve tag" });
  }
});

/**
 * GET /api/tags/:id/entries
 * Get all entries with a specific tag
 */
router.get("/:id/entries", async (req, res) => {
  try {
    const tag = await Tag.getById(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    const entries = await EntryTag.getEntriesForTag(req.params.id);
    res.json(entries);
  } catch (error) {
    console.error("Error getting entries for tag:", error);
    res.status(500).json({ error: "Failed to retrieve entries for tag" });
  }
});

/**
 * POST /api/tags
 * Create a new tag (manual creation)
 */
router.post("/", async (req, res) => {
  try {
    const { name, type, normalizedName } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "Tag name and type are required" });
    }

    const tag = await Tag.createOrGet(
      name,
      type,
      normalizedName || name.toLowerCase()
    );

    res.status(201).json(tag);
  } catch (error) {
    console.error("Error creating tag:", error);
    res.status(500).json({ error: "Failed to create tag" });
  }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag
 */
router.delete("/:id", async (req, res) => {
  try {
    const tag = await Tag.getById(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    await Tag.delete(req.params.id);

    res.json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.error("Error deleting tag:", error);
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

/**
 * POST /api/tags/:tagId/entries/:entryId
 * Add a tag to an entry
 */
router.post("/:tagId/entries/:entryId", async (req, res) => {
  try {
    const { value, metadata } = req.body;

    // Validate tag and entry exist
    const tag = await Tag.getById(req.params.tagId);
    if (!tag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    await EntryTag.add(
      req.params.entryId,
      req.params.tagId,
      value || null,
      metadata || null
    );

    res.status(201).json({ message: "Tag added to entry successfully" });
  } catch (error) {
    console.error("Error adding tag to entry:", error);
    res.status(500).json({ error: "Failed to add tag to entry" });
  }
});

/**
 * DELETE /api/tags/:tagId/entries/:entryId
 * Remove a tag from an entry
 */
router.delete("/:tagId/entries/:entryId", async (req, res) => {
  try {
    await EntryTag.remove(req.params.entryId, req.params.tagId);

    res.json({ message: "Tag removed from entry successfully" });
  } catch (error) {
    console.error("Error removing tag from entry:", error);
    res.status(500).json({ error: "Failed to remove tag from entry" });
  }
});

/**
 * GET /api/tags/name/:name/entries
 * Get all entries with a specific tag name
 */
router.get("/name/:name/entries", async (req, res) => {
  try {
    const tagName = req.params.name;
    console.log(`Searching for tag: ${tagName}`);

    // First search for the tag by name using a more flexible approach
    const matchingTags = await Tag.search(tagName);
    console.log(
      `Found ${matchingTags.length} matching tags:`,
      matchingTags.map((t) => t.name)
    );

    // Define a type priority to choose the most specific tag type
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

    // First, try exact match (case-insensitive)
    let exactMatches = matchingTags.filter(
      (t) => t.name.toLowerCase() === tagName.toLowerCase()
    );

    // Sort exact matches by type priority
    if (exactMatches.length > 0) {
      exactMatches.sort(
        (a, b) => (typeHierarchy[b.type] || 0) - (typeHierarchy[a.type] || 0)
      );
    }

    // If no exact match found, try matching by normalized_name
    let normalizedMatches = [];
    if (exactMatches.length === 0) {
      normalizedMatches = matchingTags.filter(
        (t) => t.normalized_name.toLowerCase() === tagName.toLowerCase()
      );

      // Sort normalized matches by type priority
      if (normalizedMatches.length > 0) {
        normalizedMatches.sort(
          (a, b) => (typeHierarchy[b.type] || 0) - (typeHierarchy[a.type] || 0)
        );
      }
    }

    // Choose the best match based on priorities
    const tag =
      exactMatches.length > 0
        ? exactMatches[0]
        : normalizedMatches.length > 0
        ? normalizedMatches[0]
        : matchingTags.length > 0
        ? matchingTags[0]
        : null;

    if (!tag) {
      console.log(`No tag found for: ${tagName}`);
      return res.status(404).json({ error: `Tag "${tagName}" not found` });
    }

    console.log(`Using tag: ${tag.name} (ID: ${tag.id})`);

    // Then get entries for that tag
    const entries = await EntryTag.getEntriesForTag(tag.id);
    console.log(`Found ${entries.length} entries for tag: ${tag.name}`);

    // Get complete entry data with tags
    const entriesWithTags = await Promise.all(
      entries.map(async (entry) => {
        // Get all tags for this entry
        try {
          const entryTags = await all(
            `SELECT t.* 
           FROM tags t
           JOIN entry_tags et ON t.id = et.tag_id
           WHERE et.entry_id = ?`,
            [entry.id]
          );
          return { ...entry, tags: entryTags };
        } catch (err) {
          console.error(`Error getting tags for entry ${entry.id}:`, err);
          return { ...entry, tags: [] };
        }
      })
    );

    res.json(entriesWithTags);
  } catch (error) {
    console.error("Error getting entries for tag name:", error);
    res.status(500).json({ error: "Failed to retrieve entries for tag name" });
  }
});

module.exports = router;
