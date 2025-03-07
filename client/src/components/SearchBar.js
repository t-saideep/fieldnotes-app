import React, { useState } from "react";
import { motion } from "framer-motion";
import "../styles/components.css";

/**
 * Search Bar Component
 *
 * A responsive search bar with animations and loading state.
 * Used for searching notes with natural language queries.
 *
 * @param {Object} props - Component props
 * @param {Function} props.onSearch - Function called when search is submitted
 * @param {boolean} props.isSearching - Flag indicating if search is in progress
 * @returns {JSX.Element} Rendered search bar component
 */
const SearchBar = ({ onSearch, isSearching = false }) => {
  const [query, setQuery] = useState("");

  /**
   * Handle form submission
   * @param {Event} e - The form submission event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  /**
   * Handle search button click
   */
  const handleSearchClick = () => {
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <motion.div
      className="search-container"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ position: "relative" }}>
          {/* Search icon */}
          <span className="search-icon">
            {isSearching ? (
              <span className="loader"></span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            )}
          </span>

          {/* Search input */}
          <motion.input
            type="text"
            className="search-input"
            placeholder="Ask anything about your notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isSearching}
            whileFocus={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
          />

          {/* Search button - visible on all screens */}
          <motion.button
            type="button"
            className="search-button"
            onClick={handleSearchClick}
            disabled={isSearching || !query.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Search"
          >
            Search
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

export default SearchBar;
