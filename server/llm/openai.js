/**
 * OpenAI integration for FieldNotes
 * Handles communication with OpenAI API for LLM processing
 */

const { OpenAI } = require("openai");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env file with explicit path
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Use API key from environment variables
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn("Warning: OPENAI_API_KEY environment variable is not set");
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: apiKey,
});

// Model configuration
const MODEL_NAME = "gpt-4o-mini";

/**
 * Extract structured information from a note using OpenAI
 * @param {string} noteText - The raw text of the note
 * @returns {Promise<object>} Structured information extracted from the note
 */
async function extractStructuredInfo(noteText) {
  try {
    const prompt = `
Given the following note, extract structured information:

Note: "${noteText}"

Extract the following in JSON format:
{
  "entities": [
    {
      "name": "string", // The entity name as it appears in the text
      "type": "string", // One of: person, place, object, organization, event
      "normalized_name": "string" // Standardized version of the entity name
    }
  ],
  "quantities": [
    {
      "value": "number", // The numerical value
      "unit": "string", // The unit (dollars, minutes, etc.)
      "subject": "string" // What the quantity refers to
    }
  ],
  "event_times": [
    {
      "time_value": "string", // The time as it appears in the text
      "is_approximate": "boolean", // Whether the time is approximate
      "reference_type": "string" // "absolute", "relative", etc.
    }
  ],
  "relations": [
    {
      "subject": "string", // The entity performing the relation
      "relation_type": "string", // The type of relation (likes, visited, etc.)
      "object": "string" // The entity receiving the relation
    }
  ]
}

IMPORTANT RULES:
1. Each entity should appear only ONCE in the entities array, even if mentioned multiple times.
2. Be specific about entity types - prefer specific types like "person", "place" over generic "entity".
3. For normalized_name, use a consistent, lowercase standardized version.
4. Do not create duplicate entries with different capitalization or types.
5. If any category has no relevant information, return an empty array for that category.
`;

    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "developer",
          content:
            "You are a helpful assistant that extracts structured data from notes. Output only valid JSON without any explanations or additional text.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    // Parse the response JSON
    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error("Error extracting structured info:", error);
    throw new Error(`Failed to extract structured info: ${error.message}`);
  }
}

/**
 * Answer a search query based on relevant entries
 * @param {string} query - The user's search query
 * @param {Array<object>} relevantEntries - Array of entries relevant to the query
 * @returns {Promise<string>} The LLM's answer to the query
 */
async function answerQuery(query, relevantEntries) {
  try {
    // Format the entries for the prompt
    const formattedEntries = relevantEntries
      .map(
        (entry, index) =>
          `Entry ${index + 1} [ID: ${entry.id}]: ${entry.raw_text}`
      )
      .join("\n\n");

    const prompt = `
You are an AI assistant helping to find relevant information in personal notes.

Based on these relevant notes:
${formattedEntries}

Answer the user's question: "${query}"

Follow these rules:
1. Only use information directly stated in the provided notes.
2. If the question is asking to find or list entries, mention the Entry IDs that match.
3. If the notes don't contain enough information to answer, say so clearly.
4. Keep your answer concise and to the point.
5. If applicable, organize information in a clear, readable format.
`;

    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "developer",
          content:
            "You are a helpful assistant that answers questions based on provided notes. Your answers are clear, concise, and only reference information explicitly in the notes.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error answering query:", error);
    throw new Error(`Failed to answer query: ${error.message}`);
  }
}

/**
 * Parse a search query to identify tags and entities for database search
 * @param {string} searchQuery - The user's search query
 * @returns {Promise<object>} Structured search parameters
 */
async function parseSearchQuery(searchQuery) {
  try {
    const prompt = `
Analyze this search query: "${searchQuery}"

IMPORTANT: Your task is to extract key entities and relations from search queries, especially natural language questions. Focus on extracting the SPECIFIC entities being asked about.

For example:
- Query: "When did Laya sleep?" 
  - Extract "Laya" (entity)
- Query: "Where did we see slugs?"
  - Extract "slugs" (entity)
- Query: "Show me notes about Sally"
  - Extract "Sally" (entity)

Extract search parameters in this JSON format:
{
  "entities": [
    {
      "name": "string", // Entity to search for (people, places, things)
      "type": "string" // The entity type if identifiable (person, place, etc.)
    }
  ],
  "relations": [
    {
      "subject": "string", // Subject of relation
      "relation_type": "string", // Type of relation
      "object": "string" // Object of relation
    }
  ],
  "time_range": {
    "start": "string", // Start time/date if specified
    "end": "string" // End time/date if specified
  },
  "quantities": [
    {
      "min": "number", // Minimum value if range
      "max": "number", // Maximum value if range
      "unit": "string", // Unit type
      "subject": "string" // What the quantity refers to
    }
  ]
}

Only include fields where information is clearly present in the query. Leave arrays empty if no relevant information. If a field within an object doesn't apply, omit it.
`;

    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content:
            "You are a specialized search query analyzer. Your purpose is to accurately extract entities and relationships from natural language search queries. You're especially good at identifying the core elements that a user is looking for in questions, ignoring common question words and focusing on the subject matter.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    // Parse the response JSON
    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error("Error parsing search query:", error);
    throw new Error(`Failed to parse search query: ${error.message}`);
  }
}

module.exports = {
  extractStructuredInfo,
  answerQuery,
  parseSearchQuery,
};
