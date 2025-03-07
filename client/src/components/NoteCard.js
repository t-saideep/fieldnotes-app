import React, { useState } from "react";
import { motion } from "framer-motion";
import TagBadge from "./TagBadge";
import "../styles/components.css";

/**
 * Note Card Component
 *
 * Displays a single note with its text, tags, and metadata.
 * Includes animations and interactive elements.
 *
 * @param {Object} props - Component props
 * @param {Object} props.entry - The note entry object
 * @param {Function} props.onEdit - Function called when edit button is clicked
 * @param {Function} props.onDelete - Function called when delete button is clicked
 * @returns {JSX.Element} Rendered note card component
 */
const NoteCard = ({ entry, onEdit, onDelete }) => {
  // State to track if tags are visible
  const [showTags, setShowTags] = useState(false);

  // Function to format the date nicely
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handler for when a tag is clicked
  const handleTagClick = (tagName) => {
    try {
      // Safety check
      if (!tagName) return;

      // Encode the tag name to ensure it's URL-safe
      const encodedTagName = encodeURIComponent(tagName);

      // Use a safer approach to navigate to the home page with the tag param
      const baseUrl = window.location.origin; // Gets http(s)://hostname:port
      const targetUrl = `${baseUrl}/?tag=${encodedTagName}`;

      console.log(`Navigating to: ${targetUrl}`);

      // Use replace instead of href for better performance
      window.location.replace(targetUrl);
    } catch (error) {
      console.error(`Error navigating to tag "${tagName}":`, error);
      alert(`Could not navigate to tag: ${error.message}`);
    }
  };

  // Toggle tags visibility
  const toggleTags = () => {
    setShowTags(!showTags);
  };

  // Animations for the card
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    hover: {
      y: -5,
      boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
      transition: { type: "spring", stiffness: 300 },
    },
  };

  return (
    <motion.div
      className="note-card"
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
      layout
    >
      <p className="note-card__text">{entry.raw_text}</p>

      {/* Tags toggle link - only show if there are tags */}
      {entry.tags && entry.tags.length > 0 && (
        <>
          <motion.span
            className="tags-toggle"
            onClick={toggleTags}
            initial={{ opacity: 0.8 }}
            whileHover={{ opacity: 1 }}
          >
            {showTags ? "Hide tags" : `Show tags (${entry.tags.length})`}
          </motion.span>

          {/* Tags section - hidden by default */}
          <motion.div
            className={`tags-container ${showTags ? "" : "hidden"}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: showTags ? 1 : 0,
              height: showTags ? "auto" : 0,
              marginTop: showTags ? "0.5rem" : 0,
              marginBottom: showTags ? "1rem" : 0,
            }}
            transition={{ duration: 0.3 }}
          >
            {entry.tags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                clickable={true}
                onClick={() => handleTagClick(tag.name)}
              />
            ))}
          </motion.div>
        </>
      )}

      {/* Metadata and actions */}
      <div className="note-card__meta">
        <span className="note-card__date">{formatDate(entry.created_at)}</span>

        <div className="note-card__actions">
          <motion.button
            className="btn btn--outline btn--small"
            onClick={() => onEdit(entry)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Edit
          </motion.button>
          <motion.button
            className="btn btn--outline btn--small"
            onClick={() => onDelete(entry.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Delete
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default NoteCard;
