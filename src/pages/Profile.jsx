import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { LogOut, Edit2, CheckCircle } from "lucide-react";

function Profile() {
  const [user, setUser] = useState(null);
  const [suspended, setSuspended] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = JSON.parse(localStorage.getItem("token"));
    if (!token || !token._id) return navigate("/login");

    const url =
      process.env.NODE_ENV === "production"
        ? `https://backend-vauju-1.onrender.com/api/profile`
        : `/api/profile`;

    fetch(url, { headers: { "x-user-id": token._id } })
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Failed to load profile: ${res.status} ${txt}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setUser(data);

        if (data?.suspended) {
          setSuspended(true);
          toast.error("Your account is suspended. Logging out…");
          setTimeout(() => {
            localStorage.removeItem("token");
            window.dispatchEvent(new Event("authChange"));
            navigate("/login");
          }, 1500);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load profile");
      });
  }, [navigate]);

  if (notFound) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-gray-500 text-lg">Profile not found.</div>
      </div>
    );
  }

  if (!user)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-gray-500 text-lg animate-pulse">
          Loading profile...
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <Toaster position="top-center" />
      {suspended && (
        <div className="max-w-5xl mx-auto mb-4 p-3 rounded border">
          Your account is suspended. You are being logged out.
        </div>
      )}

      <div className="bg-white p-8 w-full max-w-5xl mx-auto rounded-2xl shadow-md">
        <h2 className="text-4xl font-bold text-gray-800 flex items-center gap-2">
          {user.name}
          {user.isBlueTick && (
            <CheckCircle size={20} className="text-blue-500" />
          )}
        </h2>
        <p className="text-gray-500 text-sm mb-6">{user.email}</p>

        <div className="text-left space-y-2 bg-gray-50 p-6 rounded-2xl border border-gray-100">
          {user.bio && (
            <p>
              <span className="font-semibold text-gray-600">Bio:</span>{" "}
              {user.bio}
            </p>
          )}
          <p>
            <span className="font-semibold text-gray-600">Age:</span>{" "}
            {user.age || "-"}
          </p>
          <p>
            <span className="font-semibold text-gray-600">Gender:</span>{" "}
            {user.gender || "-"}
          </p>
          <p>
            <span className="font-semibold text-gray-600">Location:</span>{" "}
            {user.location || "-"}
          </p>
          {user.interests?.length > 0 && (
            <p>
              <span className="font-semibold text-gray-600">Interests:</span>{" "}
              {user.interests.join(", ")}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={() => navigate("/editprofile")}
            className="inline-flex items-center gap-2 bg-black text-white font-semibold px-6 py-2 rounded-full hover:bg-gray-700 transition shadow-md"
          >
            <Edit2 size={16} /> Edit Profile
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.dispatchEvent(new Event("authChange"));
              navigate("/login");
            }}
            className="inline-flex items-center gap-2 bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-full hover:bg-gray-300 cursor-pointer transition"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
