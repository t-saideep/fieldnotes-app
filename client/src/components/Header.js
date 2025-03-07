import React, { useState } from "react";
import { motion } from "framer-motion";
import "../styles/components.css";

/**
 * Header Component
 *
 * Displays the app header with title and optional navigation.
 * Uses Framer Motion for subtle animations.
 * Includes a mobile-friendly menu toggle.
 *
 * @returns {JSX.Element} Rendered header component
 */
const Header = () => {
  // State for mobile menu toggle
  const [menuOpen, setMenuOpen] = useState(false);

  // Toggle mobile menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <motion.header
      className="header"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "500" }}>
            FieldNotes
          </h1>
          <p style={{ margin: "0.25rem 0 0", opacity: 0.9, fontSize: "1rem" }}>
            Your smart note-taking assistant
          </p>
        </motion.div>

        {/* Mobile menu toggle button */}
        <motion.button
          className="menu-toggle"
          onClick={toggleMenu}
          whileTap={{ scale: 0.95 }}
        >
          {menuOpen ? "✕" : "☰"}
        </motion.button>

        {/* Navigation for desktop and mobile */}
        <nav className={menuOpen ? "open" : ""}>
          <ul
            style={{
              display: "flex",
              listStyle: "none",
              gap: "1.5rem",
              margin: 0,
              padding: 0,
            }}
          >
            <motion.li
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <a
                href="/"
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
              >
                Home
              </a>
            </motion.li>
          </ul>
        </nav>
      </div>
    </motion.header>
  );
};

export default Header;
