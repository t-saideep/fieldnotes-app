import React, { useState } from "react";
import { motion } from "framer-motion";
import "../styles/components.css";

/**
 * Note Form Component
 *
 * A form for creating or editing notes. Uses the modern controlled component
 * pattern with React hooks. Includes animation effects with Framer Motion.
 *
 * @param {Object} props - Component props
 * @param {string} props.initialText - Initial text value (for editing)
 * @param {Function} props.onSubmit - Function called when form is submitted
 * @param {boolean} props.isProcessing - Flag indicating if form is processing
 * @returns {JSX.Element} Rendered form component
 */
const NoteForm = ({ initialText = "", onSubmit, isProcessing = false }) => {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState("");

  /**
   * Handle form submission
   * @param {Event} e - The form submission event
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate input
    if (!text.trim()) {
      setError("Please enter some text for your note.");
      return;
    }

    // Call the onSubmit callback with the text
    onSubmit(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <form className="form" onSubmit={handleSubmit}>
        <div className="form__group">
          <label htmlFor="note-text" className="form__label">
            What would you like to remember?
          </label>
          <motion.textarea
            id="note-text"
            className="form__textarea"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError("");
            }}
            placeholder="Enter your note here... (e.g., 'Laya fell asleep at 8pm')"
            disabled={isProcessing}
            whileFocus={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
          />
          {error && <div className="form__error">{error}</div>}
        </div>

        <motion.button
          type="submit"
          className="btn btn--primary"
          disabled={isProcessing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isProcessing ? (
            <>
              <span className="loader" style={{ marginRight: "0.5rem" }}></span>
              Processing...
            </>
          ) : initialText ? (
            "Update Note"
          ) : (
            "Save Note"
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default NoteForm;
