import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";

// Components
import Header from "./components/Header";
import Navbar from "./components/Navbar";
import MobileNavbar from "./components/MobileNavbar";

// Pages
import Home from "./pages/Home";
import Register from "./AUTH/Register";
import Login from "./AUTH/Login";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Messages from "./pages/Messages";
import Matches from "./pages/Matches";
import Admin from "./Admin/Admin";
import AdminLogin from "./Admin/Auth/Login";
import SuspendUsers from "./Admin/SuspendUsers";
import ManageUser from "./Admin/ManageUsers";
import PageNotFound from "./pages/PageNotFound";

import "./App.css";

function AppContent() {
  const location = useLocation();

  // Pages where header/navbar should be hidden
  const hideLayout = [
    "/login",
    "/register",
    "/messages",
    "/admin/login"
  ].some(path => location.pathname === path || location.pathname.startsWith("/messages/"));

  return (
    <div className="App flex flex-col min-h-screen">
      {!hideLayout && (
        <>
          {/* Mobile Header */}
          <div className="block md:hidden">
            <Header />
          </div>

          {/* Desktop Navbar */}
          <div className="hidden md:block">
            <Navbar />
          </div>
        </>
      )}

      <main className="flex-1">
        <Routes>
          {/* Main user routes */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/editprofile" element={<EditProfile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:userId" element={<Messages />} />
          <Route path="/matches" element={<Matches />} />

          {/* Dynamic username route */}
          <Route path="/@:username" element={<Profile />} />

          {/* Admin routes */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/suspend" element={<SuspendUsers />} />
          <Route path="/admin/manage-users" element={<ManageUser />} />

          {/* Fallback 404 */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </main>

      {/* Mobile Navbar */}
      {!hideLayout && (
        <div className="md:hidden">
          <MobileNavbar />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
