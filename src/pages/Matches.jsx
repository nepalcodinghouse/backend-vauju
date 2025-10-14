import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";

// Set backend base URL
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://backend-vauju-1.onrender.com"
    : "";

function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState({ pendingApproval: false, suspended: false });
  const navigate = useNavigate();

  useEffect(() => {
    const token = JSON.parse(localStorage.getItem("token"));
    if (!token || !token._id) {
      setLoading(false);
      setError("User not logged in");
      return;
    }

    const fetchMatches = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch my profile to determine visibility status and suspension
        const profRes = await fetch(`${BASE_URL}/api/profile`, {
          headers: { "x-user-id": token._id },
        });
        if (!profRes.ok) throw new Error("Failed to fetch your profile");
        const me = await profRes.json();
        const pendingApproval = !!(me.visibilityRequested && !me.visibilityApproved);
        const suspended = !!me.suspended;
        setStatus({ pendingApproval, suspended });

        // Fetch matches
        const res = await fetch(`${BASE_URL}/api/profile/matches`, {
          headers: { "x-user-id": token._id },
        });
        if (!res.ok) throw new Error("Failed to fetch matches");
        const data = await res.json();
        setMatches(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [navigate]);

  const token = JSON.parse(localStorage.getItem("token"));
  const meId = token?._id;

  // Skeleton card for loading
  const SkeletonCard = () => (
    <div className="flex border rounded-xl shadow-sm animate-pulse overflow-hidden">
      <div className="w-1 bg-gray-300"></div>
      <div className="flex-1 p-4 space-y-2">
        <div className="h-5 bg-gray-300 rounded w-1/3"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array(8).fill(0).map((_, idx) => <SkeletonCard key={idx} />)}
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        ⚠️ {error}
      </div>
    );

  if (matches.length === 0)
    return (
      <div className="p-8 text-center text-gray-600 font-medium">
        No matches available right now 😔
      </div>
    );

  return (
    <div className="p-4">
      {(status.pendingApproval || status.suspended) && (
        <div
          className={`mb-4 p-3 rounded border ${
            status.suspended
              ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
              : 'bg-blue-50 border-blue-300 text-blue-800'
          }`}
        >
          {status.suspended
            ? 'Your account is suspended. You will not appear in Matches.'
            : 'Your visibility is pending admin approval. You will appear in Matches once approved.'}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {matches.map((u) => {
          const isMe = String(u._id) === String(meId);
          return (
            <div
              key={u._id}
              className="flex border rounded-xl shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 overflow-hidden bg-white"
            >
              {/* Vertical accent line */}
              <div
                className={`w-1 ${isMe ? "bg-indigo-500" : "bg-red-500"} transition-all`}
              ></div>

              {/* Content */}
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-lg">{u.name}</h3>
                    {isMe && (
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                        It's you
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {u.age ? `${u.age} years old` : "Age not available"}
                  </p>
                  {u.interests?.length > 0 && (
                    <p className="text-sm text-gray-700">
                      Interests: {u.interests.join(", ")}
                    </p>
                  )}
                </div>

                {!isMe && (
                  <button
                    type="button"
                    onClick={() => navigate(`/messages/${u._id}`)}
                    className="mt-3 self-start flex items-center gap-2 bg-black hover:bg-gray-800 text-white text-sm px-4 py-1.5 rounded-full font-medium transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Matches;
