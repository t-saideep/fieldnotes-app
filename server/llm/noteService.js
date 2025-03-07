/**
 * Note Service for FieldNotes
 * Integrates database operations with LLM processing
 */

const { Entry } = require("../data/models");
const { generateEmbedding, answerQuery } = require("./openai");

/**
 * Process a new note: generate embeddings and save to database
 * @param {string} noteText - The raw text of the note
 * @returns {Promise<object>} The created entry
 */
async function processNewNote(noteText) {
  try {
    let embedding = null;

    // Try to generate embeddings for the note
    try {
      console.log("Generating embeddings for new note...");
      embedding = await generateEmbedding(noteText);
      console.log("Embeddings generated successfully");
    } catch (embeddingError) {
      console.error("Error generating embeddings:", embeddingError);
      console.log("Continuing without embeddings...");
      // Continue without embeddings
    }

    // Create entry with embedding (or without if generation failed)
    let entry = await Entry.create(noteText, embedding);

    // Format the entry data to ensure consistent response
    entry = {
      ...entry,
      tags: [], // Ensure tags array is present even if empty
      // Make sure created_at has valid format if it exists, or use current timestamp
      created_at: entry.created_at || new Date().toISOString(),
      updated_at: entry.updated_at || new Date().toISOString(),
    };

    console.log(
      `Processed entry: ${JSON.stringify({
        id: entry.id,
        created_at: entry.created_at,
        text_length: entry.raw_text.length,
      })}`
    );

    return {
      entry,
      type: "entry",
    };
  } catch (error) {
    console.error("Error processing new note:", error);
    throw new Error(`Failed to process note: ${error.message}`);
  }
}

/**
 * Search for entries and answer a query
 * @param {string} searchQuery - The user's search query
 * @returns {Promise<object>} Search results and LLM answer
 */
async function searchAndAnswer(searchQuery) {
  try {
    let entries = [];

    // Generate embedding for search query if possible
    try {
      console.log(`Generating embedding for search query: "${searchQuery}"`);
      const queryEmbedding = await generateEmbedding(searchQuery);

      // Get entries using vector similarity or fallback
      entries = await Entry.findSimilar(queryEmbedding, 5);
    } catch (error) {
      console.error("Error with embedding search:", error);
      console.log("Falling back to retrieving recent entries...");
      // Fallback to getting recent entries
      entries = await Entry.getAll(5);
    }

    // If no entries found, return empty array
    if (!entries || entries.length === 0) {
      return {
        entries: [],
        type: "search",
        query: searchQuery,
        summary: "No matching entries found for your query.",
      };
    }

    // Get answer from LLM
    let answer;
    try {
      answer = await answerQuery(searchQuery, entries);
    } catch (error) {
      console.error("Error getting answer from LLM:", error);
      answer = "I couldn't generate an answer for this query.";
    }

    // Return entries and answer
    return {
      entries,
      type: "search",
      query: searchQuery,
      summary: answer,
    };
  } catch (error) {
    console.error("Error searching and answering:", error);
    throw new Error(`Failed to search and answer: ${error.message}`);
  }
}

module.exports = {
  processNewNote,
  searchAndAnswer,
};
