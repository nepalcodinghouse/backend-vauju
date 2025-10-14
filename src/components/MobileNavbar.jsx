import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Heart, MessageCircle, User } from "lucide-react";

function MobileNavbar() {
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/", icon: <Home size={24} /> },
    { name: "Matches", path: "/matches", icon: <Heart size={24} /> },
    { name: "Messages", path: "/messages", icon: <MessageCircle size={24} /> },
    { name: "Profile", path: "/profile", icon: <User size={24} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 p-2 shadow-md z-50">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center text-gray-500 ${
                isActive ? "text-indigo-600" : "hover:text-indigo-600"
              }`}
            >
              {React.cloneElement(item.icon, { color: isActive ? "#4f46e5" : "#6b7280" })}
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileNavbar;
