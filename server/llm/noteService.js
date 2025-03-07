/**
 * Note Service for FieldNotes
 * Integrates database operations with LLM processing
 */

const { Entry, Tag, EntryTag } = require("../data/models");
const {
  extractStructuredInfo,
  parseSearchQuery,
  answerQuery,
} = require("./openai");

/**
 * Normalizes an entity name by converting to lowercase, removing special characters,
 * and trimming whitespace
 * @param {string} name - The name to normalize
 * @returns {string} The normalized name
 */
function normalizeEntityName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove special characters
    .trim();
}

/**
 * Process a new note: extract structured info and save to database
 * @param {string} noteText - The raw text of the note
 * @returns {Promise<object>} The created entry with tags
 */
async function processNewNote(noteText) {
  try {
    // First create the entry in the database
    const entry = await Entry.create(noteText);

    // Extract structured info using LLM
    const structuredInfo = await extractStructuredInfo(noteText);

    // Track processed entity names to avoid duplicates
    const processedEntityNames = new Set();

    // Process entities with deduplication
    if (structuredInfo.entities && structuredInfo.entities.length > 0) {
      // First, deduplicate entities by normalized name
      const uniqueEntities = [];
      const seenNormalizedNames = new Set();

      for (const entity of structuredInfo.entities) {
        if (!entity.name) continue;
        const normalizedName =
          entity.normalized_name || entity.name.toLowerCase();
        if (!seenNormalizedNames.has(normalizedName)) {
          seenNormalizedNames.add(normalizedName);
          uniqueEntities.push(entity);
        }
      }

      // Now process the deduplicated entity list
      for (const entity of uniqueEntities) {
        const tag = await Tag.createOrGet(
          entity.name,
          entity.type || "entity",
          entity.normalized_name || entity.name.toLowerCase()
        );
        await EntryTag.add(entry.id, tag.id);
        processedEntityNames.add(entity.name.toLowerCase());
      }
    }

    // Process quantities
    if (structuredInfo.quantities && structuredInfo.quantities.length > 0) {
      for (const quantity of structuredInfo.quantities) {
        const tag = await Tag.createOrGet(
          `${quantity.value} ${quantity.unit}`,
          "quantity",
          `quantity_${quantity.unit}`
        );
        await EntryTag.add(entry.id, tag.id, quantity.value.toString(), {
          unit: quantity.unit,
          subject: quantity.subject,
        });
      }
    }

    // Process event times
    if (structuredInfo.event_times && structuredInfo.event_times.length > 0) {
      for (const eventTime of structuredInfo.event_times) {
        const tag = await Tag.createOrGet(
          eventTime.time_value,
          "time",
          `time_${eventTime.reference_type || "absolute"}`
        );
        await EntryTag.add(entry.id, tag.id, eventTime.time_value, {
          is_approximate: eventTime.is_approximate || false,
          reference_type: eventTime.reference_type || "absolute",
        });
      }
    }

    // Process relations
    if (structuredInfo.relations && structuredInfo.relations.length > 0) {
      for (const relation of structuredInfo.relations) {
        // Create the subject entity if it doesn't exist
        const subjectTag = await Tag.createOrGet(
          relation.subject,
          "entity",
          relation.subject.toLowerCase()
        );

        // Create the object entity if it doesn't exist
        const objectTag = await Tag.createOrGet(
          relation.object,
          "entity",
          relation.object.toLowerCase()
        );

        // Create a relation tag
        const relationTag = await Tag.createOrGet(
          `${relation.relation_type}`,
          "relation",
          relation.relation_type.toLowerCase()
        );

        // Add all three tags to the entry
        await EntryTag.add(entry.id, subjectTag.id);
        await EntryTag.add(entry.id, objectTag.id);
        await EntryTag.add(entry.id, relationTag.id, null, {
          subject: relation.subject,
          object: relation.object,
        });
      }
    }

    // Get the entry with all its tags
    const entryWithTags = await Entry.getById(entry.id);
    const tags = await Entry.getTags(entry.id);

    return {
      ...entryWithTags,
      tags,
    };
  } catch (error) {
    console.error("Error processing new note:", error);
    throw error;
  }
}

/**
 * Search for entries and answer a query
 * @param {string} searchQuery - The user's search query
 * @returns {Promise<object>} Search results and LLM answer
 */
async function searchAndAnswer(searchQuery) {
  // Parse the search query
  let parsedQuery;
  try {
    parsedQuery = await parseSearchQuery(searchQuery);
    console.log("Parsed query:", JSON.stringify(parsedQuery, null, 2));
  } catch (error) {
    console.error("Error parsing search query:", error);
    throw new Error(`Failed to parse search query: ${error.message}`);
  }

  // Collect all tag names from entities and relations
  const tagNames = [];

  // Process entities
  if (parsedQuery.entities && parsedQuery.entities.length > 0) {
    for (const entity of parsedQuery.entities) {
      if (entity.name) {
        tagNames.push(normalizeEntityName(entity.name));
      }
    }
  }

  // Process relations
  if (parsedQuery.relations && parsedQuery.relations.length > 0) {
    for (const relation of parsedQuery.relations) {
      // Add subject and relation type as potential tags
      if (relation.subject) {
        tagNames.push(normalizeEntityName(relation.subject));
      }
      if (relation.relation_type) {
        tagNames.push(normalizeEntityName(relation.relation_type));
      }
      if (relation.object) {
        tagNames.push(normalizeEntityName(relation.object));
      }
    }
  }

  // Remove duplicates
  const uniqueTagNames = [...new Set(tagNames)];
  console.log("Looking for tags:", uniqueTagNames);

  // Find tag IDs for all the tag names
  const tagIds = [];
  for (const name of uniqueTagNames) {
    try {
      const tag = await Tag.findByName(name);
      if (tag) {
        tagIds.push(tag.id);
      }
    } catch (error) {
      console.error(`Error finding tag for name ${name}:`, error);
      // Continue with other tags
    }
  }

  // Find entries with any of these tags
  let relevantEntries = [];
  if (tagIds.length > 0) {
    try {
      relevantEntries = await Entry.findByTagIds(tagIds);
    } catch (error) {
      console.error("Error finding entries by tag ids:", error);
      // Continue with empty relevant entries
    }
  }

  // If no relevant entries found, return empty array
  if (relevantEntries.length === 0) {
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
    answer = await answerQuery(
      searchQuery,
      relevantEntries.map((entry) => entry.raw_text)
    );
  } catch (error) {
    console.error("Error getting answer from LLM:", error);
    // Continue with empty answer
    answer = "I couldn't generate an answer for this query.";
  }

  // Return relevant entries and answer
  return {
    entries: relevantEntries,
    type: "search",
    query: searchQuery,
    summary: answer,
  };
}

module.exports = {
  processNewNote,
  searchAndAnswer,
};
