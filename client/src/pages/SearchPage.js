import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import SearchResults from "../components/SearchResults";
import api from "../services/api";

/**
 * Search Page Component
 *
 * Page where users can search their notes using natural language queries.
 * The search is processed by the LLM to find relevant notes and generate answers.
 * Also supports filtering by tags via URL parameters.
 *
 * @returns {JSX.Element} Rendered search page
 */
const SearchPage = () => {
  // State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for tag parameters in the URL on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tagParam = searchParams.get("tag");

    if (tagParam) {
      setTagFilter(tagParam);
      fetchEntriesByTag(tagParam);
    }
  }, []);

  /**
   * Fetch entries that have a specific tag
   * @param {string} tagName - The tag name to filter by
   */
  const fetchEntriesByTag = async (tagName) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`Requesting entries for tag: ${tagName}`);
      const entries = await api.getEntriesByTagName(tagName);
      console.log(
        `Successfully fetched ${entries.length} entries for tag "${tagName}"`
      );

      if (entries.length === 0) {
        setSearchResults({
          entries: [],
          type: "tag",
          tag: tagName,
          summary: `No entries found with tag "${tagName}"`,
        });
      } else {
        setSearchResults({
          entries: entries,
          type: "tag",
          tag: tagName,
          summary: `Showing ${entries.length} ${
            entries.length === 1 ? "entry" : "entries"
          } tagged with "${tagName}"`,
        });
      }
    } catch (err) {
      console.error("Error fetching entries by tag:", err);

      // Provide a more specific error message based on the error
      let errorMessage;
      if (err.message && err.message.includes("was not found")) {
        errorMessage = `Tag "${tagName}" was not found. Please check if the tag exists.`;
      } else {
        errorMessage = `Failed to load entries with tag "${tagName}". ${
          err.message || "Please try again."
        }`;
      }

      setError(errorMessage);
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle search submission
   * @param {string} query - The search query
   */
  const handleSearch = async (query) => {
    try {
      setIsSearching(true);
      setError(null);
      setTagFilter(null);

      // Update URL to remove tag parameter
      const url = new URL(window.location);
      url.searchParams.delete("tag");
      window.history.pushState({}, "", url);

      const results = await api.search(query);
      setSearchResults(results);
    } catch (err) {
      console.error("Error performing search:", err);
      setError("Failed to perform search. Please try again later.");
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Clear the current search/filter and reset the page
   */
  const handleClearSearch = () => {
    setSearchResults(null);
    setError(null);
  };

  /**
   * Handle editing an entry
   * @param {Object} entry - The entry to edit
   */
  const handleEditEntry = (entry) => {
    // Navigate to homepage with the entry ID for editing
    window.location.href = `/?edit=${entry.id}`;
  };

  /**
   * Handle deleting an entry
   * @param {number} id - The entry ID to delete
   */
  const handleDeleteEntry = async (id) => {
    // Add confirmation dialog before deleting
    const confirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );
    if (!confirmed) return;

    try {
      await api.EntriesAPI.delete(id);

      // Update search results to remove the deleted entry
      if (searchResults && searchResults.entries) {
        setSearchResults({
          ...searchResults,
          entries: searchResults.entries.filter((entry) => entry.id !== id),
        });
      }
    } catch (err) {
      console.error("Error deleting entry:", err);
      setError("Failed to delete the note. Please try again.");
    }
  };

  // Page animations
  const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1, transition: { duration: 0.5 } },
    out: { opacity: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
    >
      <Header />

      <div className="container">
        <div style={{ marginBottom: "2rem" }}>
          <h1>Search Your Notes</h1>
          <p>
            Search through your notes using natural language or{" "}
            {tagFilter ? (
              <>
                view entries with tag <strong>"{tagFilter}"</strong>{" "}
                <button
                  onClick={handleClearSearch}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary-color)",
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: "500",
                  }}
                >
                  (Clear)
                </button>
              </>
            ) : (
              "filter by tags"
            )}
          </p>
        </div>

        {!tagFilter && (
          <SearchBar onSearch={handleSearch} isSearching={isSearching} />
        )}

        {isSearching || isLoading ? (
          <div className="loader" style={{ margin: "2rem auto" }}></div>
        ) : error ? (
          <p style={{ color: "var(--error-color)" }}>{error}</p>
        ) : (
          searchResults && (
            <SearchResults
              results={searchResults}
              onEditEntry={handleEditEntry}
              onDeleteEntry={handleDeleteEntry}
            />
          )
        )}
      </div>
    </motion.div>
  );
};

export default SearchPage;
