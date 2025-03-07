import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import HomePage from "./pages/HomePage";
import TagsPage from "./pages/TagsPage";
import "./styles/index.css";
import "./styles/components.css";

/**
 * SearchRedirect Component
 *
 * Preserves query parameters when redirecting from /search to /
 */
const SearchRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/${location.search}`} replace />;
};

/**
 * Main App Component
 *
 * Sets up routing and provides the main structure for the application.
 * Uses React Router for navigation and Framer Motion for page transitions.
 * The search functionality is now integrated into the home page.
 *
 * @returns {JSX.Element} Rendered app component
 */
const App = () => {
  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tags" element={<TagsPage />} />
          {/* Redirect old search URLs to home page, preserving parameters */}
          <Route path="/search" element={<SearchRedirect />} />
          {/* Add more routes as needed */}
        </Routes>
      </AnimatePresence>
    </Router>
  );
};

export default App;
