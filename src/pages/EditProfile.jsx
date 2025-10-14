import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

// 🔗 Backend URL
const BASE_URL = "http://localhost:5000/";

function EditProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    bio: "",
    age: "",
    gender: "other",
    interests: "",
    location: "",
    visible: false,
  });
  const [loading, setLoading] = useState(false);

  // Load user profile
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("token"));
    if (!user || !user._id) return navigate("/login");

    fetch(`${BASE_URL}/api/profile`, { headers: { "x-user-id": user._id } })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) =>
        setForm({
          name: data.name || "",
          bio: data.bio || "",
          age: data.age || "",
          gender: data.gender || "other",
          interests: (data.interests && data.interests.join(", ")) || "",
          location: data.location || "",
          visible: data.visible || false,
        })
      )
      .catch((err) => toast.error("Failed to load profile: " + err.message));
  }, [navigate]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    const user = JSON.parse(localStorage.getItem("token"));
    if (!user || !user._id) return;

    try {
      const res = await fetch(`${BASE_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user._id,
        },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Update failed");

      // Update local storage token
      localStorage.setItem("token", JSON.stringify({ ...user, ...result }));
      window.dispatchEvent(new Event("authChange"));

      toast.success(
        form.visible
          ? "Request sent. Admin approval required to appear in Matches."
          : "Profile updated successfully!"
      );

      navigate("/profile");
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center py-10 px-4 bg-gray-50">
      <Toaster position="top-center" />
      <div className="w-full max-w-lg bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/40">
        <h2 className="text-3xl font-bold text-center text-black mb-6">
          Edit Profile
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded-xl px-4 py-2"
              required
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              className="w-full border rounded-xl px-4 py-2"
              rows="3"
            />
          </div>

          {/* Age & Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Age</label>
              <input
                name="age"
                type="number"
                value={form.age}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-2"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-2"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Interests
            </label>
            <input
              name="interests"
              value={form.interests}
              onChange={handleChange}
              className="w-full border rounded-xl px-4 py-2"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full border rounded-xl px-4 py-2"
            />
          </div>

          {/* Visible toggle */}
          <div className="flex items-center justify-between bg-gray-50 border rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-gray-700">
              Show me in Matches
            </span>
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, visible: !f.visible }))
              }
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                form.visible ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full transform transition ${
                  form.visible ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
