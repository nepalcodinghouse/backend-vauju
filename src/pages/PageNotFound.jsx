import React from "react";
import { Link } from "react-router-dom";

function PageNotFound() {
  return (
    <div className="min-h-screen flex flex-col justify-left items-left bg-gray-50 px-4 text-left">

      <h1 className="text-6xl font-extrabold text-gray-800 mb-4">404</h1>
      
      <h2 className="text-2xl font-semibold text-gray-700 mb-2">
        Oops! Page Not Found
      </h2>
      <p className="text-gray-500 mb-8 ">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>

      <div className="flex gap-4">
        <Link
          to="/"
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
        >
          Go Home
        </Link>
        <Link
          to="/contact"
          className="px-6 py-3 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}

export default PageNotFound;
