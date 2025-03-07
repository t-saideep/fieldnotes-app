import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import TagBadge from "../components/TagBadge";
import api from "../services/api";
import "../styles/index.css";

/**
 * Tags Page Component
 *
 * Displays all available tags in the system with counts of associated entries.
 *
 * @returns {JSX.Element} Rendered tags page
 */
const TagsPage = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState(null);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        console.log("Fetching tags...");
        const response = await api.getTags();
        console.log("Tags response:", response);
        setDebug(JSON.stringify(response, null, 2));

        if (response && Array.isArray(response)) {
          setTags(response);
          setLoading(false);
        } else {
          console.error("Unexpected response format:", response);
          setError("Received invalid data format from server.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching tags:", err);
        setDebug(JSON.stringify(err, null, 2));
        setError("Failed to load tags. Please try again later.");
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  // Handle tag click in a safe way that works on mobile devices
  const handleTagClick = (tagName) => {
    try {
      // Safety check
      if (!tagName) return;

      // Encode the tag name to ensure it's URL-safe
      const encodedTagName = encodeURIComponent(tagName);

      // Use a safer approach to navigate to the search page with the tag param
      const baseUrl = window.location.origin; // Gets http(s)://hostname:port
      const targetUrl = `${baseUrl}/search?tag=${encodedTagName}`;

      console.log(`Navigating to: ${targetUrl}`);

      // Use replace instead of href for better performance
      window.location.replace(targetUrl);
    } catch (error) {
      console.error(`Error navigating to tag "${tagName}":`, error);
      alert(`Could not navigate to tag: ${error.message}`);
    }
  };

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <>
      <Header />
      <motion.div
        className="container"
        initial="initial"
        animate="in"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.4 }}
      >
        <h1>Tags</h1>

        {loading ? (
          <p>Loading tags...</p>
        ) : error ? (
          <div>
            <p className="error-message">{error}</p>
            {debug && (
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: "10px",
                  borderRadius: "4px",
                  overflow: "auto",
                  maxWidth: "100%",
                  fontSize: "12px",
                }}
              >
                {debug}
              </pre>
            )}
          </div>
        ) : tags.length === 0 ? (
          <div>
            <p>No tags found. Start adding notes with tags to see them here.</p>
            {debug && (
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: "10px",
                  borderRadius: "4px",
                  overflow: "auto",
                  maxWidth: "100%",
                  fontSize: "12px",
                }}
              >
                {debug}
              </pre>
            )}
          </div>
        ) : (
          <div>
            <div
              className="tags-container"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginTop: "1.5rem",
              }}
            >
              {tags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  tag={tag.name}
                  count={tag.count || 0}
                  clickable={true}
                  onClick={() => handleTagClick(tag.name)}
                />
              ))}
            </div>
            {debug && (
              <pre
                style={{
                  marginTop: "20px",
                  background: "#f5f5f5",
                  padding: "10px",
                  borderRadius: "4px",
                  overflow: "auto",
                  maxWidth: "100%",
                  fontSize: "12px",
                }}
              >
                {debug}
              </pre>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
};

export default TagsPage;
