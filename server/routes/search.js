/**
 * Routes for search functionality
 */

const express = require("express");
const router = express.Router();
const { searchAndAnswer } = require("../llm/noteService");

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

module.exports = router;
