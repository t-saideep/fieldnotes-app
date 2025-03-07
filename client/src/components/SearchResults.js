import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import NoteCard from "./NoteCard";
import "../styles/components.css";

/**
 * Search Results Component
 *
 * Displays search results including a list of matching notes
 * and the LLM-generated answer to the query, or entries filtered by tag.
 *
 * @param {Object} props - Component props
 * @param {Object} props.results - Results object containing entries and metadata
 * @param {Function} props.onEditEntry - Function to handle editing an entry
 * @param {Function} props.onDeleteEntry - Function to handle deleting an entry
 * @returns {JSX.Element} Rendered search results component
 */
const SearchResults = ({ results, onEditEntry, onDeleteEntry }) => {
  if (!results || !results.entries || results.entries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="search-no-results"
      >
        <p>No results found.</p>
      </motion.div>
    );
  }

  const { entries, type, summary } = results;
  const isTagFilter = type === "tag";

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren",
      },
    },
  };

  const answerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.3 } },
  };

  return (
    <AnimatePresence>
      <motion.div
        className="search-results"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Summary text or AI answer */}
        {summary && (
          <motion.div
            className="search-results__summary"
            variants={answerVariants}
            style={{
              marginBottom: "2rem",
              padding: "1.5rem",
              borderRadius: "var(--border-radius)",
              backgroundColor: isTagFilter
                ? "var(--card-color)"
                : "rgba(211, 84, 0, 0.15)",
              boxShadow: "var(--box-shadow)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {isTagFilter ? "Filtered Results" : "Answer"}
            </h3>
            <p style={{ whiteSpace: "pre-line" }}>{summary}</p>
          </motion.div>
        )}

        {/* Matching entries */}
        <div>
          <h3 style={{ marginBottom: "1rem" }}>
            {entries.length} {entries.length === 1 ? "Entry" : "Entries"} Found
          </h3>
          <div
            style={{
              display: "grid",
              gap: "1.5rem",
              gridTemplateColumns: "1fr",
            }}
          >
            {entries.map((entry) => (
              <NoteCard
                key={entry.id}
                entry={entry}
                onEdit={onEditEntry}
                onDelete={onDeleteEntry}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchResults;
