import React from "react";
import { motion } from "framer-motion";
import "../styles/components.css";

/**
 * Tag Badge Component
 *
 * Displays a single tag as a colored badge.
 * Different tag types have different colors.
 * Includes hover animations and optional functionality.
 *
 * @param {Object} props - Component props
 * @param {Object|string} props.tag - The tag object or tag name string
 * @param {number} props.count - Optional count of entries with this tag
 * @param {boolean} props.clickable - Whether the tag is clickable
 * @param {Function} props.onClick - Optional callback for tag click
 * @param {Function} props.onRemove - Optional callback for tag removal
 * @returns {JSX.Element} Rendered tag badge component
 */
const TagBadge = ({ tag, count, clickable, onClick, onRemove }) => {
  // Handle both object and string versions of tag
  const isTagObject = typeof tag === "object";
  const tagName = isTagObject ? tag.name : tag;
  const tagType = isTagObject ? tag.type : "default";
  const tagValue = isTagObject ? tag.value : null;

  // Get the appropriate CSS class based on tag type
  const getTagClass = () => {
    if (!isTagObject) return "tag--default";

    switch (tagType) {
      case "person":
      case "place":
      case "object":
      case "organization":
      case "event":
        return "tag--entity";
      case "activity":
        return "tag--activity";
      case "time":
        return "tag--time";
      case "quantity":
        return "tag--quantity";
      case "relation":
        return "tag--relation";
      default:
        return "tag--default";
    }
  };

  // Get an icon or emoji based on tag type
  const getTagIcon = () => {
    if (!isTagObject) return null;

    switch (tagType) {
      case "person":
        return <span className="tag__icon">👤 </span>;
      case "place":
        return <span className="tag__icon">📍 </span>;
      case "object":
        return <span className="tag__icon">🔖 </span>;
      case "organization":
        return <span className="tag__icon">🏢 </span>;
      case "event":
        return <span className="tag__icon">📅 </span>;
      case "activity":
        return <span className="tag__icon">🏃‍♂️ </span>;
      case "time":
        return <span className="tag__icon">🕒 </span>;
      case "quantity":
        return <span className="tag__icon">🔢 </span>;
      case "relation":
        return <span className="tag__icon">🔗 </span>;
      default:
        return null;
    }
  };

  // Get the display text for the tag
  const getTagText = () => {
    // If we have a value, show it with the tag name
    if (tagValue) {
      return `${tagName}: ${tagValue}`;
    }

    return tagName;
  };

  return (
    <motion.span
      className={`tag ${getTagClass()}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 500 }}
      onClick={clickable && onClick ? onClick : undefined}
      style={{ cursor: clickable ? "pointer" : "default" }}
    >
      {getTagIcon()}
      {getTagText()}
      {count !== undefined && <span className="tag__count">{count}</span>}

      {onRemove && (
        <motion.span
          className="tag__remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(isTagObject ? tag.id : tag);
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          ✕
        </motion.span>
      )}
    </motion.span>
  );
};

export default TagBadge;
