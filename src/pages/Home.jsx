import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Circle, MessageSquare } from "lucide-react";

function Home() {
  const [topUsers, setTopUsers] = useState([]);
  const [loadingTop, setLoadingTop] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadTop = async () => {
      try {
        setLoadingTop(true);
        const token = JSON.parse(localStorage.getItem('token')) || {};
        const me = token?._id;
        // fetch matches
        let matches = [];
        try {
          const res = await fetch('https://backend-vauju-1.onrender.com/api/profile/matches', { headers: me ? { 'x-user-id': me } : {} });
          if (res.ok) matches = await res.json();
        } catch (e) {}
        if (!Array.isArray(matches)) matches = [];
        // fetch online users
        let onlineIds = [];
        try {
          const ores = await fetch('https://backend-vauju-1.onrender.com/api/messages/online-users', { headers: me ? { 'x-user-id': me } : {} });
          if (ores.ok) onlineIds = await ores.json();
        } catch (e) {}
        const onlineSet = new Set((onlineIds || []).map(String));
        const withOnline = matches
          .filter(u => u && u._id && String(u._id) !== String(me))
          .map(u => ({ ...u, isOnline: onlineSet.has(String(u._id)) }));
        // sort online first, then by name
        withOnline.sort((a, b) => (Number(b.isOnline) - Number(a.isOnline)) || String(a.name || '').localeCompare(String(b.name || '')));
        setTopUsers(withOnline.slice(0, 4));
      } finally {
        setLoadingTop(false);
      }
    };
    loadTop();
  }, []);
  return (
    <div className="bg-gray-50 min-h-screen pt-20 font-sans">
    
      {/* Hero Section */}
      <section className="text-center px-4 py-24 bg-white shadow-sm">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          Meet Your Perfect Match
        </h1>
        <p className="text-gray-600 mb-8 max-w-xl mx-auto">
          HeartConnect helps you discover like-minded people nearby. Sign up and start connecting today!
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/register"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow hover:bg-indigo-700 transition"
          >
            Sign Up
          </Link>
          <Link
            to="/matches"
            className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg shadow hover:bg-indigo-600 hover:text-white transition"
          >
            Browse Matches
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
          Why Choose HeartConnect?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
            <Heart className="mx-auto text-indigo-500 mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Safe & Secure</h3>
            <p className="text-gray-600">
              Your privacy is our priority. Chat and connect with confidence.
            </p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
            <Heart className="mx-auto text-indigo-500 mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Find Love Nearby</h3>
            <p className="text-gray-600">
              Discover people in your area and start meaningful connections.
            </p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
            <Heart className="mx-auto text-indigo-500 mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Easy to Use</h3>
            <p className="text-gray-600">
              User-friendly interface to browse, chat, and connect seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* Top Matches Section */}
      <section className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Top Matches
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          {loadingTop ? (
            [1,2,3,4].map((i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow animate-pulse">
                <div className="w-24 h-24 mx-auto rounded-full bg-gray-200 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto" />
              </div>
            ))
          ) : (
            (topUsers.length > 0 ? topUsers : []).map((u) => (
              <div
                key={u._id}
                className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition text-center"
              >
                <div className="relative w-24 h-24 mx-auto rounded-full bg-gray-200 mb-4 flex items-center justify-center text-gray-500">
                  {/* avatar placeholder */}
                  <span className="text-xl">{String(u.name || '?').charAt(0).toUpperCase()}</span>
                  <Circle className={`w-3 h-3 absolute right-1 bottom-1 ${u.isOnline ? 'text-green-500' : 'text-gray-400'}`} />
                </div>
                <h3 className="font-semibold text-gray-800">{u.name || 'Unknown'}</h3>
                {u.age && <p className="text-gray-500 text-sm">Age: {u.age}</p>}
                <div className="mt-3 flex justify-center gap-3">
                  <Link to="/matches" className="text-indigo-600 hover:underline">View</Link>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                    onClick={() => navigate(`/messages/${u._id}`)}
                    aria-label={`Message ${u.name}`}
                    title={`Message ${u.name}`}
                  >
                    <MessageSquare className="w-4 h-4" /> Message
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}

export default Home;
