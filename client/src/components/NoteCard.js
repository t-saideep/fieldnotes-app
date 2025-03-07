import React from "react";
import { motion } from "framer-motion";
import "../styles/components.css";

/**
 * Note Card Component
 *
 * Displays a single note with its text and metadata.
 * Includes animations and interactive elements.
 *
 * @param {Object} props - Component props
 * @param {Object} props.entry - The note entry object
 * @param {Function} props.onEdit - Function called when edit button is clicked
 * @param {Function} props.onDelete - Function called when delete button is clicked
 * @returns {JSX.Element} Rendered note card component
 */
const NoteCard = ({ entry, onEdit, onDelete }) => {
  // Function to format the date nicely
  const formatDate = (dateStr) => {
    try {
      // If no date provided, return current date
      if (!dateStr) {
        return new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Parse the date string
      const date = new Date(dateStr);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date encountered:", dateStr);
        return new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Return formatted date
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      // Return current date as fallback
      return new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
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
      <p className="note-card__text" style={{ whiteSpace: "pre-line" }}>
        {entry.raw_text}
      </p>

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
