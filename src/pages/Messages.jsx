import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io as ioClient } from "socket.io-client";
import { UserCircle2, MessageSquare, Circle } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const API_URL = "https://backend-vauju-1.onrender.com";

function Messages() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const params = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const convoRef = useRef(null);
  const socketRef = useRef(null);
  const presenceTimeoutRef = useRef({}); // Track presence timeouts

  // 🔔 Request Notification Permission Once
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            console.log("✅ Notifications enabled");
          }
        });
      }
    }
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = JSON.parse(localStorage.getItem("token")) || {};
        if (!token._id) {
          console.warn("No user token found");
          return;
        }

        const res = await fetch(`${API_URL}/api/profile/messages-users`, {
          headers: { "x-user-id": token._id },
          timeout: 10000,
        });

        if (!res.ok) {
          if (res.status === 401) {
            toast.error("Please login again");
            localStorage.removeItem("token");
            navigate("/login");
            return;
          }
          throw new Error(`Server error: ${res.status}`);
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Server returned HTML instead of JSON. Check backend.");
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        let onlineIds = [];
        try {
          const onlineRes = await fetch(`${API_URL}/api/messages/online-users`, {
            headers: { "x-user-id": token._id },
            timeout: 5000,
          });
          if (onlineRes.ok) onlineIds = await onlineRes.json();
        } catch (e) {
          console.warn("Online users fetch failed:", e);
        }

        const onlineSet = new Set((onlineIds || []).map(String));
        setUsers(list.map((u) => ({ isOnline: onlineSet.has(String(u._id)), ...u })));
      } catch (err) {
        console.error("Messages fetch error:", err);
        toast.error("Failed to fetch users: " + (err.message || "unknown"));
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!params.userId || users.length === 0) return;
    const u = users.find((x) => String(x._id) === String(params.userId));
    if (u) handleSelectUser(u);
  }, [params.userId, users]);

  useEffect(() => {
    const doBeat = async () => {
      try {
        const me = getMeId();
        await fetch(`${API_URL}/api/messages/heartbeat`, {
          method: "POST",
          headers: { "x-user-id": me },
        });
      } catch {}
    };
    doBeat();
    const t = setInterval(doBeat, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const me = getMeId();
    if (!me) return;
    const socket = ioClient(API_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });
    socketRef.current = socket;

    const identify = () => {
      try {
        socket.emit("identify", me);
        // Send initial presence
        socket.emit("presence", { userId: me, online: true });
      } catch (e) {}
    };

    socket.on("connect", identify);
    socket.io?.on?.("reconnect", identify);
    socket.on("connect_error", (err) =>
      console.warn("socket connect_error", err?.message || err)
    );

    // 🔥 When message received
    socket.on("message", (m) => {
      // Update chat if it's the selected user
      if (
        selectedUser &&
        (String(m.from) === String(selectedUser._id) ||
          String(m.to) === String(selectedUser._id))
      ) {
        setMessages((prev) => [...prev, m]);
        if (String(m.from) === String(selectedUser._id)) {
          fetch(`${API_URL}/api/messages/seen/${m._id}`, {
            method: "PUT",
            headers: { "x-user-id": getMeId() },
          });
        }
      }

      // 🔔 Browser Notification
      const meId = getMeId();
      if (String(m.from) !== String(meId)) {
        if ("Notification" in window && Notification.permission === "granted") {
          const sender = users.find((u) => String(u._id) === String(m.from));
          const title = sender ? `${sender.name} sent a message` : "New Message";
          const body = m.text || "You’ve got a new message!";
          const notif = new Notification(title, {
            body,
            icon: "/logo192.png",
          });

          notif.onclick = () => {
            window.focus();
            navigate(`/messages/${m.from}`);
          };
        }
      }

      // Update user online state
      setUsers((prev) =>
        prev.map((u) => {
          if (String(u._id) === String(m.from)) {
            // Clear any existing timeout for this user
            if (presenceTimeoutRef.current[u._id]) {
              clearTimeout(presenceTimeoutRef.current[u._id]);
            }
            // Set timeout to mark user offline after 35 seconds of no activity
            presenceTimeoutRef.current[u._id] = setTimeout(() => {
              setUsers((prevUsers) =>
                prevUsers.map((user) =>
                  String(user._id) === String(u._id)
                    ? { ...user, isOnline: false }
                    : user
                )
              );
            }, 35000);
            return { ...u, isOnline: true };
          }
          return u;
        })
      );
    });

    socket.on("seen", (m) => {
      setMessages((prev) =>
        prev.map((x) => (x._id === m._id ? { ...x, seen: true } : x))
      );
    });

    socket.on("presence", ({ userId, online }) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (String(u._id) === String(userId)) {
            // Clear existing timeout if user is online
            if (online && presenceTimeoutRef.current[u._id]) {
              clearTimeout(presenceTimeoutRef.current[u._id]);
            }
            // Set timeout for offline status if user goes offline
            if (!online) {
              presenceTimeoutRef.current[u._id] = setTimeout(() => {
                setUsers((prevUsers) =>
                  prevUsers.map((user) =>
                    String(user._id) === String(userId)
                      ? { ...user, isOnline: false }
                      : user
                  )
                );
              }, 5000); // Grace period before marking offline
            }
            return { ...u, isOnline: Boolean(online) };
          }
          return u;
        })
      );
    });

    return () => {
      try {
        socket.off("message");
        socket.off("seen");
        socket.off("presence");
        // Clear all presence timeouts
        Object.values(presenceTimeoutRef.current).forEach(clearTimeout);
        socket.emit("presence", { userId: me, online: false });
      } catch (e) {}
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedUser, users]);

  const getMeId = () => {
    const t = JSON.parse(localStorage.getItem("token")) || {};
    return t._id;
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    navigate(`/messages/${user._id}`);
    await fetchConversation(user._id);
    markAllAsSeenWith(user._id);
  };

  const formatTimestamp = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeOptions = { hour: "numeric", minute: "2-digit" };
    const dateOptions = { month: "short", day: "numeric" };

    if (sameDay) return `Today at ${d.toLocaleTimeString([], timeOptions)}`;
    if (isYesterday) return `Yesterday at ${d.toLocaleTimeString([], timeOptions)}`;
    return `${d.toLocaleDateString([], dateOptions)} at ${d.toLocaleTimeString([], timeOptions)}`;
  };

  const fetchConversation = async (userId) => {
    try {
      const me = getMeId();
      if (!me) {
        toast.error("Please login first");
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/messages/conversation/${userId}`, {
        headers: { "x-user-id": me },
        timeout: 10000,
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Please login again");
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
      convoRef.current?.scrollTo({
        top: convoRef.current.scrollHeight,
        behavior: "auto",
      });
    } catch (err) {
      console.error("Conversation load error", err);
      toast.error("Failed to load conversation: " + (err.message || "unknown"));
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedUser) return;
    try {
      const me = getMeId();
      if (!me) {
        toast.error("Please login first");
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": me,
        },
        body: JSON.stringify({ to: selectedUser._id, text: text.trim() }),
        timeout: 10000,
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Please login again");
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        throw new Error(`Send failed: ${res.status}`);
      }

      const m = await res.json();
      setMessages((prev) => [...prev, m]);
      setText("");
      convoRef.current?.scrollTo({
        top: convoRef.current.scrollHeight,
        behavior: "auto",
      });
    } catch (err) {
      console.error("Send error", err);
      toast.error("Failed to send message: " + (err.message || "unknown"));
    }
  };

  const markAllAsSeenWith = async (userId) => {
    try {
      const me = getMeId();
      const res = await fetch(`${API_URL}/api/messages/conversation/${userId}`, {
        headers: { "x-user-id": me },
      });
      if (!res.ok) return;
      const msgs = await res.json();
      const unseen = msgs.filter((m) => String(m.from) === String(userId) && !m.seen);
      for (const m of unseen) {
        await fetch(`${API_URL}/api/messages/seen/${m._id}`, {
          method: "PUT",
          headers: { "x-user-id": me },
        });
      }
      await fetchConversation(userId);
    } catch (err) {
      console.error("Mark seen error", err);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <Toaster position="top-right" />

      {/* Left Section */}
      <aside
        className={`w-full sm:w-80 border-r border-gray-200 bg-white overflow-y-auto transition-all duration-300 ${
          selectedUser ? "hidden sm:block" : ""
        }`}
      >
        <h2 className="text-xl font-semibold text-center py-3 border-b bg-gray-50">
          Chats
        </h2>

        {users.length > 0 ? (
          users.map((user) => (
            <div
              key={user._id}
              onClick={() => handleSelectUser(user)}
              className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg mx-2 my-1 ${
                selectedUser?._id === user._id ? "bg-gray-100" : ""
              }`}
            >
              <UserCircle2 className="w-9 h-9 text-gray-400" />
              <div className="ml-3 flex-1 overflow-hidden">
                <h3 className="text-[15px] font-medium truncate text-gray-900">
                  {user.name}
                </h3>
                <p className="text-[12px] text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
              <Circle
                className={`w-2.5 h-2.5 ml-2 ${
                  user.isOnline ? "text-green-500" : "text-gray-300"
                }`}
              />
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 py-6">No users found 😕</p>
        )}
      </aside>

      {/* Right Section */}
      <main
        className={`flex-1 flex flex-col bg-white transition-all duration-300 ${
          selectedUser ? "w-full sm:w-[calc(100%-20rem)]" : ""
        }`}
      >
        {selectedUser ? (
          <>
            <header className="flex items-center justify-between p-3 border-b bg-white/90 backdrop-blur sticky top-0 z-10">
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    navigate("/messages");
                  }}
                  className="mr-2 sm:hidden text-gray-600 font-medium hover:text-gray-800"
                >
                  Back
                </button>
                <UserCircle2 className="w-8 h-8 text-gray-400" />
                <div className="ml-3">
                  <h2 className="text-[15px] font-semibold text-gray-900">
                    {selectedUser.name}
                  </h2>
                  <span
                    className={`text-[12px] ${
                      selectedUser.isOnline ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {selectedUser.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate("/")}
                className="text-[12px] px-3 py-1 rounded-full bg-gray-900 text-white hover:bg-black"
              >
                Home
              </button>
            </header>

            <div ref={convoRef} className="flex-1 p-3 overflow-y-auto bg-white">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center mt-10">
                  Start chatting with {selectedUser.name} 💬
                </p>
              ) : (
                messages.map((m, idx) => {
                  const meId = String(getMeId());
                  const isMine = String(m.from) === meId;
                  const prev = messages[idx - 1];
                  const next = messages[idx + 1];
                  const sameAsPrev =
                    prev && String(prev.from) === String(m.from);
                  const sameAsNext =
                    next && String(next.from) === String(m.from);
                  const isStartOfGroup = !sameAsPrev;
                  const isEndOfGroup = !sameAsNext;
                  const showDateDivider = (() => {
                    if (!prev) return true;
                    const d1 = new Date(prev.createdAt).toDateString();
                    const d2 = new Date(m.createdAt).toDateString();
                    return d1 !== d2;
                  })();
                  return (
                    <div
                      key={m._id}
                      className={`my-1 max-w-2xl ${
                        isMine ? "ml-auto" : "mr-auto"
                      }`}
                    >
                      {showDateDivider && (
                        <div className="flex items-center justify-center my-2">
                          <div className="text-[11px] text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {new Date(m.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                      )}
                      <div
                        className={`flex flex-col ${
                          isMine ? "items-end" : "items-start"
                        } gap-1`}
                      >
                        {isStartOfGroup && (
                          <div className={`text-[11px] mb-0.5 text-gray-500`}>
                            {isMine ? "You" : selectedUser?.name}
                          </div>
                        )}
                        <div
                          className={`group relative inline-block px-4 py-2 rounded-2xl whitespace-pre-wrap break-words leading-relaxed max-w-[80%] border 
                          ${
                            isMine
                              ? "bg-white text-gray-900 border-blue-200 shadow-sm"
                              : "bg-white text-gray-900 border-gray-200 shadow-sm"
                          }`}
                        >
                          {m.isUnsent ? (
                            <span
                              className={`italic ${
                                isMine ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {isMine
                                ? "You unsent a message"
                                : "Message unsent"}
                            </span>
                          ) : (
                            m.text
                          )}
                        </div>
                        {isEndOfGroup && (
                          <div
                            className={`text-[11px] text-gray-500 block ${
                              isMine ? "text-right" : "text-left"
                            }`}
                          >
                            {formatTimestamp(m.createdAt)}
                            {isMine ? (m.seen ? " · Seen" : " · Sent") : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <footer className="p-3 border-t bg-white flex items-center gap-2 sticky bottom-0">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                type="text"
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 transition text-[14px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
              />
              <button
                onClick={handleSend}
                className="px-4 py-2 rounded-full flex items-center gap-1 bg-gray-900 hover:bg-black text-white text-[14px]"
              >
                <MessageSquare className="w-5 h-5" /> Send
              </button>
            </footer>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-center px-4">
            Select a user to start chatting 💬
          </div>
        )}
      </main>

      <button
        onClick={() => navigate("/")}
        className="fixed bottom-4 left-4 sm:hidden bg-gray-900 text-white text-[12px] px-3 py-2 rounded-full shadow-lg"
      >
        Home
      </button>
    </div>
  );
}

export default Messages;