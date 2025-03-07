/**
 * Routes for search functionality
 */

const express = require("express");
const router = express.Router();
const { searchAndAnswer } = require("../llm/noteService");
const { Tag } = require("../data/models");

/**
 * Search notes and get AI-generated answers
 * POST /api/search
 */
router.post("/", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid search query",
      });
    }

    console.log(`Processing search query: "${query}"`);
    const results = await searchAndAnswer(query);

    return res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      error: "Error processing search request",
      message: error.message,
    });
  }
});

/**
 * GET /api/search/tags
 * Search for tags (for autocomplete/suggestions)
 */
router.get("/tags", async (req, res) => {
  try {
    const { query, type } = req.query;

    if (!query || typeof query !== "string") {
      // If no query, return all tags grouped by type
      const allTags = await Tag.getAll(type || null);
      return res.json(allTags);
    }

    const tags = await Tag.search(query);

    // If type filter is specified, filter the results
    const filteredTags = type ? tags.filter((tag) => tag.type === type) : tags;

    res.json(filteredTags);
  } catch (error) {
    console.error("Error searching tags:", error);
    res.status(500).json({ error: "Failed to search tags" });
  }
});

module.exports = router;
