/**
 * API Service
 *
 * This module provides functions to interact with the backend API.
 * It encapsulates all API calls and handles errors consistently.
 */

import axios from "axios";

// Determine the API base URL dynamically
const getBaseUrl = () => {
  try {
    // For development on the same machine, continue using relative path
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "/api";
    }

    // When accessing from another device on the network, use the server IP and port
    // Make sure to use the server port (5001), not the React dev server port
    return `http://${window.location.hostname}:5001/api`;
  } catch (error) {
    console.error("Error determining base URL:", error);
    // Fallback to relative path in case of any errors
    return "/api";
  }
};

// Create an axios instance with default config
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  // Explicitly set withCredentials to false for cross-origin requests
  withCredentials: false,
  // Add a timeout to prevent hanging requests
  timeout: 10000,
});

// Add request interceptor to help with debugging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor to help with debugging
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    // Format error message for easier debugging
    let errorMessage = "Unknown error occurred";
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      errorMessage = `Server error: ${error.response.status} - ${error.response.statusText}`;
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = "No response received from server";
    } else {
      // Something happened in setting up the request
      errorMessage = error.message || "Error setting up request";
    }

    console.error("API Response Error:", errorMessage);
    return Promise.reject(error);
  }
);

/**
 * Entries API
 */
export const EntriesAPI = {
  /**
   * Get all entries with pagination
   * @param {number} limit - Maximum number of entries to retrieve
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} - Array of entries
   */
  getAll: async (limit = 50, offset = 0) => {
    try {
      const response = await api.get(
        `/entries?limit=${limit}&offset=${offset}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching entries:", error);
      throw error;
    }
  },

  /**
   * Get an entry by ID
   * @param {number} id - Entry ID
   * @returns {Promise<Object>} - Entry object
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/entries/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching entry ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new entry
   * @param {string} text - Entry text content
   * @returns {Promise<Object>} - Created entry object
   */
  create: async (text) => {
    try {
      const response = await api.post("/entries", { text });

      // Handle the new response format
      const data = response.data;

      // If the response has an entry property (new format), use that
      const entry = data.entry || data;

      // Validate and normalize the entry to ensure all required fields are present
      if (entry) {
        // Ensure created_at is valid
        if (!entry.created_at || entry.created_at === "Invalid Date") {
          entry.created_at = new Date().toISOString();
        }

        // Ensure tags are present
        if (!entry.tags) {
          entry.tags = [];
        }

        // Log for debugging
        console.log("Processed entry data:", {
          id: entry.id,
          created_at: entry.created_at,
          has_tags: Array.isArray(entry.tags),
          text_length: entry.raw_text?.length,
        });
      }

      return data;
    } catch (error) {
      console.error("Error creating entry:", error);
      throw error;
    }
  },

  /**
   * Update an entry
   * @param {number} id - Entry ID
   * @param {string} text - New entry text
   * @returns {Promise<Object>} - Updated entry object
   */
  update: async (id, text) => {
    try {
      const response = await api.put(`/entries/${id}`, { text });
      return response.data;
    } catch (error) {
      console.error(`Error updating entry ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete an entry
   * @param {number} id - Entry ID
   * @returns {Promise<Object>} - Deletion status
   */
  delete: async (id) => {
    try {
      const response = await api.delete(`/entries/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting entry ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get entries by tag name
   * @param {string} tagName - Tag name to filter by
   * @returns {Promise<Array>} - Array of entries with the specified tag
   */
  getEntriesByTagName: async (tagName) => {
    try {
      const response = await api.get(
        `/tags/name/${encodeURIComponent(tagName)}/entries`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching entries for tag ${tagName}:`, error);
      throw error;
    }
  },
};

/**
 * Tags API
 */
export const TagsAPI = {
  /**
   * Get all tags
   * @param {string} type - Optional filter by tag type
   * @returns {Promise<Array>} - Array of tags
   */
  getAll: async (type = null) => {
    try {
      const url = type ? `/tags?type=${type}` : "/tags";
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching tags:", error);
      throw error;
    }
  },

  /**
   * Get a tag by ID
   * @param {number} id - Tag ID
   * @returns {Promise<Object>} - Tag object
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/tags/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching tag ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new tag
   * @param {string} name - Tag name
   * @param {string} type - Tag type
   * @param {string} normalizedName - Optional normalized name
   * @returns {Promise<Object>} - Created tag object
   */
  create: async (name, type, normalizedName) => {
    try {
      const response = await api.post("/tags", { name, type, normalizedName });
      return response.data;
    } catch (error) {
      console.error("Error creating tag:", error);
      throw error;
    }
  },

  /**
   * Delete a tag
   * @param {number} id - Tag ID
   * @returns {Promise<Object>} - Deletion status
   */
  delete: async (id) => {
    try {
      const response = await api.delete(`/tags/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting tag ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get entries by tag ID
   * @param {number} id - Tag ID
   * @returns {Promise<Array>} - Array of entries with the specified tag
   */
  getEntries: async (id) => {
    try {
      const response = await api.get(`/tags/${id}/entries`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching entries for tag ${id}:`, error);
      throw error;
    }
  },

  /**
   * Add a tag to an entry
   * @param {number} tagId - Tag ID
   * @param {number} entryId - Entry ID
   * @param {string} value - Optional value for the tag
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} - Status object
   */
  addToEntry: async (tagId, entryId, value = null, metadata = null) => {
    try {
      const response = await api.post(`/tags/${tagId}/entries/${entryId}`, {
        value,
        metadata,
      });
      return response.data;
    } catch (error) {
      console.error(`Error adding tag ${tagId} to entry ${entryId}:`, error);
      throw error;
    }
  },

  /**
   * Remove a tag from an entry
   * @param {number} tagId - Tag ID
   * @param {number} entryId - Entry ID
   * @returns {Promise<Object>} - Status object
   */
  removeFromEntry: async (tagId, entryId) => {
    try {
      const response = await api.delete(`/tags/${tagId}/entries/${entryId}`);
      return response.data;
    } catch (error) {
      console.error(
        `Error removing tag ${tagId} from entry ${entryId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Get entries by tag name
   * @param {string} tagName - The name of the tag
   * @returns {Promise<Array>} - Array of entries with the specified tag
   */
  getEntriesByName: async (tagName) => {
    try {
      console.log(`Fetching entries for tag: ${tagName}`);
      const response = await api.get(
        `/tags/name/${encodeURIComponent(tagName)}/entries`
      );
      console.log(
        `Received ${response.data.length} entries for tag ${tagName}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching entries for tag "${tagName}":`, error);

      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);

        // If the tag wasn't found, provide a more specific error
        if (error.response.status === 404) {
          throw new Error(`Tag "${tagName}" was not found`);
        }
      }

      // Rethrow with a more informative message
      throw new Error(
        `Failed to fetch entries for tag "${tagName}": ${error.message}`
      );
    }
  },
};

/**
 * Search API
 */
export const SearchAPI = {
  /**
   * Search for entries matching a query
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Search results
   */
  search: async (query) => {
    try {
      const response = await api.post("/search", { query });
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || "Unknown search error");
      }
    } catch (error) {
      console.error("Error performing search:", error);
      throw error;
    }
  },

  /**
   * Search for tags (autocomplete)
   * @param {string} query - Search query for tags
   * @param {string} type - Optional tag type filter
   * @returns {Promise<Array>} - Array of matching tags
   */
  searchTags: async (query, type = null) => {
    try {
      const url = type
        ? `/search/tags?query=${query}&type=${type}`
        : `/search/tags?query=${query}`;

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("Error searching tags:", error);
      throw error;
    }
  },
};

// Create an API object to export
const API = {
  EntriesAPI,
  TagsAPI,
  SearchAPI,
  getTags: TagsAPI.getAll,
  getTagById: TagsAPI.getById,
  getEntriesByTag: TagsAPI.getEntries,
  getEntriesByTagName: TagsAPI.getEntriesByName,
  search: SearchAPI.search,
};

export default API;
