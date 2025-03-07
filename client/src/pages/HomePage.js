import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import NoteForm from "../components/NoteForm";
import NoteCard from "../components/NoteCard";
import SearchBar from "../components/SearchBar";
import SearchResults from "../components/SearchResults";
import { EntriesAPI, SearchAPI, TagsAPI } from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Home Page Component
 *
 * The main page of the application where users can:
 * - Add new notes
 * - View existing notes
 * - Edit or delete notes
 * - Search notes
 *
 * @returns {JSX.Element} Rendered home page
 */
const HomePage = () => {
  // State
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [error, setError] = useState(null);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Tag filter state
  const [tagFilter, setTagFilter] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Fetch entries on component mount and check for URL parameters
  useEffect(() => {
    // Check for tag parameters in the URL
    const searchParams = new URLSearchParams(window.location.search);
    const tagParam = searchParams.get("tag");

    if (tagParam) {
      try {
        console.log(`Found tag parameter in URL: ${tagParam}`);
        setTagFilter(tagParam);
        // Use a safe way to decode the tag parameter
        const decodedTag = decodeURIComponent(tagParam);
        console.log(`Processing tag parameter: "${decodedTag}"`);
        fetchEntriesByTag(decodedTag);
      } catch (error) {
        console.error("Error processing tag parameter:", error);
        setError(`Failed to load entries for tag: ${error.message}`);
        // Fall back to loading all entries if there's an error with the tag
        fetchEntries();
      }
    } else {
      fetchEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Fetch all entries from the API
   */
  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const data = await EntriesAPI.getAll();
      setEntries(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching entries:", err);
      setError("Failed to load notes. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch entries that have a specific tag
   * @param {string} tagName - The tag name to filter by
   */
  const fetchEntriesByTag = async (tagName) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`Requesting entries for tag: ${tagName}`);

      // Wrap API call in a try-catch for better error handling
      let entries;
      try {
        entries = await TagsAPI.getEntriesByName(tagName);
      } catch (apiError) {
        console.error(
          `API error fetching entries for tag "${tagName}":`,
          apiError
        );
        throw new Error(`API error: ${apiError.message || "Unknown error"}`);
      }

      console.log(
        `Successfully fetched ${entries.length} entries for tag "${tagName}"`
      );

      // Set these as search results for consistency in display
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

      setSearchError(errorMessage);
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle creating a new entry
   * @param {string} text - The note text
   */
  const handleCreateEntry = async (text) => {
    try {
      setIsProcessing(true);
      const response = await EntriesAPI.create(text);

      // Handle the new response format which includes {entry, type}
      const newEntry = response.entry || response;

      // Log the entry for debugging
      console.log("New entry created:", newEntry);

      // Ensure the entry has all required fields
      if (!newEntry.created_at) {
        newEntry.created_at = new Date().toISOString();
      }
      if (!newEntry.tags) {
        newEntry.tags = [];
      }

      // Add entry to the local state
      setEntries([newEntry, ...entries]);
      setError(null);

      // Clear search results when creating a new entry
      setSearchResults(null);
      setTagFilter(null);

      // Clear URL parameters
      window.history.replaceState(null, "", "/");
    } catch (err) {
      console.error("Error creating entry:", err);
      setError("Failed to save your note. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle updating an existing entry
   * @param {string} text - The updated note text
   */
  const handleUpdateEntry = async (text) => {
    if (!editingEntry) return;

    try {
      setIsProcessing(true);
      const updatedEntry = await EntriesAPI.update(editingEntry.id, text);

      setEntries(
        entries.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry
        )
      );

      setEditingEntry(null);
      setError(null);

      // Clear search results when updating an entry
      setSearchResults(null);
      setTagFilter(null);

      // Clear URL parameters
      window.history.replaceState(null, "", "/");
    } catch (err) {
      console.error("Error updating entry:", err);
      setError("Failed to update your note. Please try again.");
    } finally {
      setIsProcessing(false);
    }
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
      await EntriesAPI.delete(id);
      setEntries(entries.filter((entry) => entry.id !== id));

      // If currently editing this entry, cancel the edit
      if (editingEntry && editingEntry.id === id) {
        setEditingEntry(null);
      }

      // If this entry is in search results, update them
      if (searchResults && searchResults.entries) {
        setSearchResults({
          ...searchResults,
          entries: searchResults.entries.filter((entry) => entry.id !== id),
        });
      }

      setError(null);
    } catch (err) {
      console.error("Error deleting entry:", err);
      setError("Failed to delete the note. Please try again.");
    }
  };

  /**
   * Set an entry for editing
   * @param {Object} entry - The entry to edit
   */
  const handleEditEntry = (entry) => {
    setEditingEntry(entry);

    // Scroll to the form
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /**
   * Cancel editing the current entry
   */
  const handleCancelEdit = () => {
    setEditingEntry(null);
  };

  /**
   * Handle search submission
   * @param {string} query - The search query
   */
  const handleSearch = async (query) => {
    if (!query.trim()) {
      return;
    }

    try {
      setIsSearching(true);
      setSearchError(null);
      setSearchResults(null);

      // Clear URL parameters
      navigate(location.pathname, { replace: true });

      console.log("Searching for:", query);
      const results = await SearchAPI.search(query);

      // Log search results for debugging
      console.log("Search results:", results);

      if (results) {
        setSearchResults(results);
      } else {
        setSearchError("No results found");
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError(error.message || "Failed to perform search");
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Clear search results and go back to showing all entries
   */
  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchError(null);
    setTagFilter(null);

    // Clear URL parameters
    window.history.replaceState(null, "", "/");

    // Reload all entries
    fetchEntries();
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <SearchBar onSearch={handleSearch} isSearching={isSearching} />

            {searchError && (
              <div
                style={{
                  backgroundColor: "#ffebee",
                  color: "#c62828",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--border-radius)",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                }}
              >
                {searchError}
              </div>
            )}
          </motion.div>

          <h1 style={{ marginBottom: "1.5rem" }}>
            {editingEntry ? "Edit Note" : "Add New Note"}
          </h1>

          {error && (
            <div
              style={{
                backgroundColor: "#ffebee",
                color: "#c62828",
                padding: "0.75rem 1rem",
                borderRadius: "var(--border-radius)",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          <NoteForm
            initialText={editingEntry ? editingEntry.raw_text : ""}
            onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry}
            isProcessing={isProcessing}
          />

          {editingEntry && (
            <motion.button
              className="btn btn--outline"
              onClick={handleCancelEdit}
              style={{ marginTop: "-1rem", marginBottom: "2rem" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel Editing
            </motion.button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {/* Show search results if available, otherwise show normal content */}
          {searchResults ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h2>
                  {tagFilter ? `Tagged with "${tagFilter}"` : "Search Results"}
                </h2>
                <motion.button
                  className="btn btn--outline btn--small"
                  onClick={handleClearSearch}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Back to All Notes
                </motion.button>
              </div>
              <SearchResults
                results={searchResults}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
              />
            </>
          ) : (
            <>
              <h2 style={{ marginBottom: "1.5rem" }}>Your Notes</h2>

              {isLoading ? (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <div
                    className="loader"
                    style={{ width: "30px", height: "30px" }}
                  ></div>
                  <p style={{ marginTop: "1rem" }}>Loading your notes...</p>
                </div>
              ) : entries.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                    backgroundColor: "var(--card-color)",
                    borderRadius: "var(--border-radius)",
                    boxShadow: "var(--box-shadow)",
                  }}
                >
                  <h3>No notes yet</h3>
                  <p style={{ margin: "1rem 0" }}>
                    Add your first note above to get started!
                  </p>
                </div>
              ) : (
                <div>
                  {entries.map((entry) => (
                    <NoteCard
                      key={entry.id}
                      entry={entry}
                      onEdit={handleEditEntry}
                      onDelete={handleDeleteEntry}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default HomePage;
