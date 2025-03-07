import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import NoteForm from "../components/NoteForm";
import NoteCard from "../components/NoteCard";
import SearchBar from "../components/SearchBar";
import SearchResults from "../components/SearchResults";
import { EntriesAPI, SearchAPI } from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Home Page Component
 *
 * The main page of the application where users can:
 * - Add new notes
 * - Search for existing notes
 * - View and interact with notes
 */
const HomePage = () => {
  // Navigation and location hooks
  const navigate = useNavigate();
  const location = useLocation();

  // Parse query parameters
  const query = new URLSearchParams(location.search);
  const searchParam = query.get("search");

  // State for entries/notes
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search state
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Edit state
  const [editingEntry, setEditingEntry] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Handle search query submission
   * @param {string} query - The search query
   */
  const handleSearch = useCallback(
    async (query) => {
      if (!query || query.trim() === "") {
        setSearchResults(null);
        navigate("/");
        return;
      }

      try {
        setIsSearching(true);
        setError(null);

        // Update URL to include search parameter
        navigate(`/?search=${encodeURIComponent(query)}`, { replace: true });

        // Execute search using debounced function to prevent duplicate requests
        const results = await SearchAPI.debouncedSearch(query);
        setSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
        setError("Error processing search. Please try a different query.");
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    },
    [navigate]
  );

  // Initial data loading
  useEffect(() => {
    if (searchParam) {
      handleSearch(searchParam);
    } else {
      fetchEntries();
    }
  }, [searchParam, handleSearch]);

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
      setError("Failed to load notes. Please try refreshing the page.");
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

      // Update the entries array with the updated entry
      setEntries(
        entries.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
      );

      // If this entry is in search results, update it there too
      if (searchResults && searchResults.entries) {
        setSearchResults({
          ...searchResults,
          entries: searchResults.entries.map((e) =>
            e.id === updatedEntry.id ? updatedEntry : e
          ),
        });
      }

      // Clear editing state
      setEditingEntry(null);
      setError(null);
    } catch (err) {
      console.error("Error updating entry:", err);
      setError("Failed to update your note. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle deleting an entry
   * @param {number} id - The ID of the entry to delete
   */
  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      await EntriesAPI.delete(id);

      // Remove from entries array
      setEntries(entries.filter((e) => e.id !== id));

      // If this entry is in search results, remove it there too
      if (searchResults && searchResults.entries) {
        setSearchResults({
          ...searchResults,
          entries: searchResults.entries.filter((e) => e.id !== id),
        });
      }

      setError(null);
    } catch (err) {
      console.error("Error deleting entry:", err);
      setError("Failed to delete the note. Please try again.");
    }
  };

  /**
   * Set the current entry being edited
   * @param {object} entry - The entry to edit
   */
  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    // Scroll to the edit form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Cancel editing and clear edit state
   */
  const handleCancelEdit = () => {
    setEditingEntry(null);
  };

  /**
   * Clear current search results
   */
  const handleClearSearch = () => {
    setSearchResults(null);
    // Remove search parameter from URL
    navigate("/", { replace: true });
  };

  // Main content based on current state
  const renderMainContent = () => {
    // Show error message if there is an error
    if (error) {
      return (
        <motion.div
          className="error-message"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </motion.div>
      );
    }

    // Show search results if available
    if (searchResults) {
      return (
        <div className="content-section">
          <div className="section-header">
            <h2>Search Results</h2>
            <button
              className="btn btn--outline"
              onClick={handleClearSearch}
              disabled={isSearching}
            >
              Clear Search
            </button>
          </div>
          <SearchResults results={searchResults} onClear={handleClearSearch} />
        </div>
      );
    }

    // Show entries/notes
    return (
      <div className="content-section">
        <h2 className="section-title">Your Notes</h2>
        {isLoading ? (
          <p className="loading-message">Loading notes...</p>
        ) : entries.length === 0 ? (
          <p className="empty-message">No notes yet. Create your first one!</p>
        ) : (
          <div className="entries-grid">
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
      </div>
    );
  };

  return (
    <div className="page">
      <Header />
      <main className="main-content">
        <div className="container">
          <div className="search-section">
            <SearchBar
              initialQuery={searchParam || ""}
              onSearch={handleSearch}
              isSearching={isSearching}
            />
          </div>

          <div className="form-section">
            <NoteForm
              initialText={editingEntry ? editingEntry.raw_text : ""}
              isSubmitting={isProcessing}
              onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry}
              onCancel={editingEntry ? handleCancelEdit : null}
              title={editingEntry ? "Edit Note" : "Add Note"}
              submitLabel={editingEntry ? "Update" : "Save Note"}
            />
          </div>

          {renderMainContent()}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
