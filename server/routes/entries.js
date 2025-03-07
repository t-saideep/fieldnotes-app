/**
 * Routes for managing entries
 */

const express = require("express");
const router = express.Router();
const { Entry } = require("../data/models");
const { processNewNote } = require("../llm/noteService");

/**
 * GET /api/entries
 * Get all entries with pagination
 */
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const entries = await Entry.getAll(limit, offset);

    // For each entry, get its tags
    const entriesWithTags = await Promise.all(
      entries.map(async (entry) => {
        const tags = await Entry.getTags(entry.id);
        return {
          ...entry,
          tags,
        };
      })
    );

    res.json(entriesWithTags);
  } catch (error) {
    console.error("Error getting entries:", error);
    res.status(500).json({ error: "Failed to retrieve entries" });
  }
});

/**
 * GET /api/entries/:id
 * Get a specific entry by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const entry = await Entry.getById(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const tags = await Entry.getTags(entry.id);

    res.json({
      ...entry,
      tags,
    });
  } catch (error) {
    console.error("Error getting entry:", error);
    res.status(500).json({ error: "Failed to retrieve entry" });
  }
});

/**
 * POST /api/entries
 * Create a new entry and process it with LLM
 */
router.post("/", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "Entry text is required" });
    }

    // Process the note through the LLM service
    const processedEntry = await processNewNote(text);

    res.status(201).json(processedEntry);
  } catch (error) {
    console.error("Error creating entry:", error);
    res.status(500).json({ error: "Failed to create entry" });
  }
});

/**
 * PUT /api/entries/:id
 * Update an existing entry
 */
router.put("/:id", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "Entry text is required" });
    }

    const entry = await Entry.getById(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    // For simplicity, we'll just update the text without reprocessing tags
    // In a full implementation, you might want to delete old tags and reprocess
    const updatedEntry = await Entry.update(req.params.id, text);
    const tags = await Entry.getTags(req.params.id);

    res.json({
      ...updatedEntry,
      tags,
    });
  } catch (error) {
    console.error("Error updating entry:", error);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

/**
 * DELETE /api/entries/:id
 * Delete an entry
 */
router.delete("/:id", async (req, res) => {
  try {
    const entry = await Entry.getById(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    await Entry.delete(req.params.id);

    res.json({ message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

module.exports = router;
