import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import HomePage from "./pages/HomePage";
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
 * This is the root component of the application that sets up routing.
 *
 * @returns {JSX.Element} The rendered app with routing
 */
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchRedirect />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
