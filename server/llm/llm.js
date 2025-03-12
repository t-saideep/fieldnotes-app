/**
 * LLM integrations for FieldNotes
 * Handles communication with various LLM providers (OpenAI and Google Gemini)
 */

const { OpenAI } = require("openai");
const dotenv = require("dotenv");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load environment variables from .env file with explicit path
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Get API keys from environment variables
const openaiApiKey = process.env.OPENAI_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!openaiApiKey) {
  console.warn("Warning: OPENAI_API_KEY environment variable is not set");
}

if (!geminiApiKey) {
  console.warn("Warning: GEMINI_API_KEY environment variable is not set");
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Initialize Gemini client
const geminiClient = new GoogleGenerativeAI(geminiApiKey);

// Model configuration
const OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_MODEL = "gemini-2.0-flash-lite";
const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * The system prompt used for both LLM providers
 */
const SYSTEM_PROMPT =
  "You are a helpful assistant that answers questions based on provided notes. Your answers are clear, concise, and only reference information explicitly in the notes. If the notes don't have the information, say so clearly.";

// Provider selection flag - can be 'openai' or 'gemini'
let LLM_PROVIDER = process.env.DEFAULT_LLM_PROVIDER || "gemini";

/**
 * Set the LLM provider to use for future requests
 * @param {string} provider - The provider to use ('openai' or 'gemini')
 */
function setLlmProvider(provider) {
  if (provider === "openai" || provider === "gemini") {
    LLM_PROVIDER = provider;
    console.log(`LLM provider set to: ${provider}`);
  } else {
    console.error(
      `Invalid LLM provider: ${provider}. Using default: ${LLM_PROVIDER}`
    );
  }
}

/**
 * Get the current LLM provider
 * @returns {string} The current LLM provider ('openai' or 'gemini')
 */
function getLlmProvider() {
  return LLM_PROVIDER;
}

/**
 * Generate embeddings for text
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<Float32Array>} The embeddings as a Float32Array
 */
async function generateEmbedding(text) {
  try {
    // Check if API key is valid first
    if (!openaiApiKey || openaiApiKey.trim() === "") {
      throw new Error(
        "OpenAI API key is missing or invalid. Please set OPENAI_API_KEY in server/.env file."
      );
    }

    console.log("Calling OpenAI to generate embeddings...");
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error("OpenAI returned an invalid embedding response");
    }

    console.log("Successfully received embeddings from OpenAI");
    return response.data[0].embedding;
  } catch (error) {
    // Provide more helpful error messages based on error type
    if (error.status === 401) {
      console.error(
        "Authentication error with OpenAI API. Please check your API key in server/.env file."
      );
    } else if (error.status === 429) {
      console.error("OpenAI API rate limit exceeded. Please try again later.");
    } else if (error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
      console.error(
        "Network error when connecting to OpenAI. Please check your internet connection."
      );
    }

    console.error("Error generating embeddings:", error);
    throw error;
  }
}

/**
 * Format entries for prompting LLMs
 * @param {Array<object>} entries - Array of entries to format
 * @returns {string} Formatted entries string
 */
function formatEntries(entries) {
  return entries
    .map(
      (entry, index) =>
        `Entry ${index + 1} [ID: ${entry.id}]: ${entry.raw_text}`
    )
    .join("\n\n");
}

/**
 * Creates the user prompt for note querying
 * @param {string} formattedEntries - Formatted entries string
 * @param {string} query - The user's query
 * @returns {string} Complete user prompt
 */
function createUserPrompt(formattedEntries, query) {
  return `I have the following personal notes:\n\n${formattedEntries}\n\nBased only on these notes, answer this question: ${query}\n\nAFTER your answer, include a separate line break, then provide the ENTRY NUMBERS (not IDs) that were relevant to answering the query in EXACTLY this format:\nRELEVANT_ENTRIES:[1,2,...]\n\nThe RELEVANT_ENTRIES format must be separate from your main answer and must appear on its own line. Do not include this format within paragraphs of your answer.\n\nOnly include entries that are directly relevant to answering the query. If no entries are relevant, return RELEVANT_ENTRIES:[]`;
}

/**
 * Process LLM response to extract answer and relevant entry IDs
 * @param {string} content - Raw text response from LLM
 * @param {Array<object>} entries - Original entries array
 * @returns {object} Object with answer and relevantIds
 */
function processLlmResponse(content, entries) {
  console.log("Processing LLM response content:", content);

  // Extract the relevant entry indices from the response
  let relevantIndices = [];
  const relevantEntriesMatch = content.match(/RELEVANT_ENTRIES:\[(.*?)\]/);

  if (relevantEntriesMatch && relevantEntriesMatch[1]) {
    // Extract and parse the indices
    const indicesString = relevantEntriesMatch[1];
    relevantIndices = indicesString
      .split(",")
      .map((idx) => idx.trim())
      .filter((idx) => idx)
      .map((idx) => {
        const parsed = parseInt(idx, 10);
        return isNaN(parsed) ? null : parsed - 1; // Convert from 1-indexed to 0-indexed
      })
      .filter((idx) => idx !== null);

    console.log("Extracted relevant indices (0-indexed):", relevantIndices);

    // Map the indices to actual database IDs
    const relevantIds = relevantIndices
      .filter((idx) => idx >= 0 && idx < entries.length)
      .map((idx) => entries[idx].id);

    console.log("Mapped to database IDs:", relevantIds);

    // Remove the RELEVANT_ENTRIES part from the content for the final answer
    const answer = content.replace(/RELEVANT_ENTRIES:\[.*?\]/g, "").trim();
    console.log("Final answer:", answer);

    return {
      answer,
      relevantIds,
    };
  } else {
    console.log("No relevant entries format found in the response");
    // Even if the format wasn't properly detected, still attempt to remove any RELEVANT_ENTRIES text
    const answer = content.replace(/RELEVANT_ENTRIES:\[.*?\]/g, "").trim();
    return {
      answer,
      relevantIds: [],
    };
  }
}

/**
 * Answer a search query with the provided entries using OpenAI
 * @param {string} query - The user's search query
 * @param {Array<object>} entries - Array of entries relevant to the query
 * @returns {Promise<object>} The LLM's answer to the query and relevant entry IDs
 */
async function answerQueryWithOpenAI(query, entries) {
  try {
    // Check if API key is valid first
    if (!openaiApiKey || openaiApiKey.trim() === "") {
      return {
        answer: `I couldn't answer your query because the OpenAI API key is missing. Please set OPENAI_API_KEY in server/.env file.`,
        relevantIds: [],
      };
    }

    // Format the entries for prompt
    const formattedEntries = formatEntries(entries);
    console.log(
      `Generating answer using OpenAI with ${entries.length} entries...`
    );

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: createUserPrompt(formattedEntries, query),
        },
      ],
      temperature: 0.3,
    });

    return processLlmResponse(response.choices[0].message.content, entries);
  } catch (error) {
    console.error("Error generating answer with OpenAI:", error);

    // Provide a useful error message
    let errorMessage;
    if (error.status === 401) {
      errorMessage = `I couldn't answer your query because of an authentication error with OpenAI. Please check your API key in server/.env file.`;
    } else if (error.status === 429) {
      errorMessage = `I couldn't answer your query because the OpenAI API rate limit has been exceeded. Please try again later.`;
    } else {
      errorMessage = `I couldn't answer your query due to an error: ${error.message}`;
    }

    return {
      answer: errorMessage,
      relevantIds: [],
    };
  }
}

/**
 * Answer a search query with the provided entries using Gemini
 * @param {string} query - The user's search query
 * @param {Array<object>} entries - Array of entries relevant to the query
 * @returns {Promise<object>} The LLM's answer to the query and relevant entry IDs
 */
async function answerQueryWithGemini(query, entries) {
  try {
    // Check if API key is valid first
    if (!geminiApiKey || geminiApiKey.trim() === "") {
      return {
        answer: `I couldn't answer your query because the Gemini API key is missing. Please set GEMINI_API_KEY in server/.env file.`,
        relevantIds: [],
      };
    }

    // Format the entries for prompt
    const formattedEntries = formatEntries(entries);
    console.log(
      `Generating answer using Gemini with ${entries.length} entries...`
    );

    // Initialize the model
    const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });

    // Create prompt and get response
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      createUserPrompt(formattedEntries, query),
    ]);

    return processLlmResponse(result.response.text(), entries);
  } catch (error) {
    console.error("Error generating answer with Gemini:", error);

    return {
      answer: `I couldn't answer your query due to an error with Gemini: ${error.message}`,
      relevantIds: [],
    };
  }
}

/**
 * Answer a search query with the provided entries using the currently selected LLM provider
 * @param {string} query - The user's search query
 * @param {Array<object>} entries - Array of entries relevant to the query
 * @returns {Promise<object>} The LLM's answer to the query and relevant entry IDs
 */
async function answerQuery(query, entries) {
  if (LLM_PROVIDER === "openai") {
    return answerQueryWithOpenAI(query, entries);
  } else {
    return answerQueryWithGemini(query, entries);
  }
}

module.exports = {
  answerQuery,
  generateEmbedding,
  setLlmProvider,
  getLlmProvider,
};
