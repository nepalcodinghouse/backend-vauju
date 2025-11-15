import Message from "../models/Message.js";
import mongoose from "mongoose";
import { isDbConnected } from "../config/db.js";
import { generateEncryptionKey, encryptMessage, decryptMessage, hashValue, compareHash } from "../utils/encryption.js";

// Minimal in-memory store for messages/presence when DB is absent
const messageStore = { messages: [], presence: {} };
const PRESENCE_TTL_MS = 60 * 1000; // online if heartbeat within last 60s

// --- Helper to emit messages safely ---
const emitMessage = (io, userSockets, userId, event, data) => {
  const sockets = userSockets.get(String(userId));
  if (!sockets) return;
  sockets.forEach(sid => {
    const socket = io.sockets.sockets.get(sid);
    if (socket && socket.connected) {
      socket.emit(event, data, { received: true });
    }
  });
};

// --- Queue-based batching to prevent socket buffer overload ---
const sendQueue = new Map();
const flushQueue = (io, userSockets, userId) => {
  const queue = sendQueue.get(userId);
  if (!queue || queue.length === 0) return;

  const batched = [...queue];
  sendQueue.set(userId, []);
  emitMessage(io, userSockets, userId, 'messages', batched);
};

// --- Send Message ---
export const sendMessage = async (req, res) => {
  try {
    const { to, text } = req.body;
    if (!to || !text) return res.status(400).json({ message: "Missing to/text" });

    // Generate encryption key and encrypt message
    const encryptionKey = generateEncryptionKey();
    const encryptedContent = encryptMessage(text, encryptionKey);
    const contentKeyHash = await hashValue(encryptionKey);

    let msg;

    if (isDbConnected() && mongoose.connection.readyState === 1) {
      msg = await Message.create({ 
        from: req.user._id, 
        to, 
        encryptedContent,
        contentKeyHash
      });
      if (String(req.user._id) === String(to)) {
        msg = await Message.findByIdAndUpdate(msg._id, { seen: true }, { new: true });
      }
    } else {
      // Fallback: in-memory store
      msg = { 
        _id: `m-${Date.now()}`, 
        from: req.user._id, 
        to, 
        encryptedContent,
        contentKeyHash,
        seen: String(req.user._id) === String(to), 
        createdAt: new Date() 
      };
      messageStore.messages.push(msg);
    }

    // Emit via socket
    try {
      const io = req.app?.locals?.io;
      const userSockets = req.app?.locals?.userSockets;
      if (io && userSockets) {
        [to, req.user._id].forEach(uid => {
          if (!sendQueue.has(uid)) sendQueue.set(uid, []);
          sendQueue.get(uid).push(msg);
          setTimeout(() => flushQueue(io, userSockets, uid), 50); // flush after 50ms
        });
      }
    } catch (e) { console.error(e); }

    // Return message with encryption key for sender's records
    const responseMessage = {
      ...msg.toObject ? msg.toObject() : msg,
      encryptionKey: encryptionKey, // Only sent to sender for their records
      isEncrypted: true
    };

    return res.json(responseMessage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Get Conversation ---
export const getConversation = async (req, res) => {
  try {
    const otherId = req.params.userId;
    if (!otherId) return res.status(400).json({ message: "No userId" });

    let msgs = [];
    if (isDbConnected() && mongoose.connection.readyState === 1) {
      const raw = await Message.find({ $or: [
        { from: req.user._id, to: otherId },
        { from: otherId, to: req.user._id }
      ]}).sort({ createdAt: 1 });
      msgs = raw.filter(m => !m.deletedFor?.some(u => String(u) === String(req.user._id)));
    } else {
      msgs = messageStore.messages.filter(m => (
        (String(m.from) === String(req.user._id) && String(m.to) === String(otherId)) ||
        (String(m.from) === String(otherId) && String(m.to) === String(req.user._id))
      ) && !(Array.isArray(m.deletedFor) && m.deletedFor.map(String).includes(String(req.user._id))));
      msgs.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    // Add a flag to indicate messages are encrypted and need client-side decryption
    const responseMessages = msgs.map(msg => ({
      ...msg.toObject ? msg.toObject() : msg,
      isEncrypted: true,
      encryptedContent: msg.encryptedContent
    }));

    res.json(responseMessages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Mark Seen ---
export const markSeen = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    if (!messageId) return res.status(400).json({ message: "No messageId" });

    let m;
    if (isDbConnected() && mongoose.connection.readyState === 1) {
      m = await Message.findByIdAndUpdate(messageId, { seen: true }, { new: true });
    } else {
      m = messageStore.messages.find(x => x._id === messageId);
      if (m) m.seen = true;
    }

    if (m) {
      const io = req.app?.locals?.io;
      const userSockets = req.app?.locals?.userSockets;
      if (io && userSockets) emitMessage(io, userSockets, m.from, 'seen', m);
      return res.json(m);
    }

    res.status(404).json({ message: "Not found" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Heartbeat ---
export const heartbeat = async (req, res) => {
  try {
    const userId = String(req.user._id);
    messageStore.presence[userId] = Date.now();

    try {
      const io = req.app?.locals?.io;
      if (io) io.emit('presence', { userId, online: true });
    } catch (e) {}

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Delete for Me ---
export const deleteForMe = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    if (!messageId) return res.status(400).json({ message: "No messageId" });

    let m;
    if (isDbConnected() && mongoose.connection.readyState === 1) {
      m = await Message.findById(messageId);
      if (!m) return res.status(404).json({ message: "Not found" });
      const userId = String(req.user._id);
      m = await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: userId } }, { new: true });
    } else {
      m = messageStore.messages.find(x => x._id === messageId);
      if (!m) return res.status(404).json({ message: "Not found" });
      const userId = String(req.user._id);
      m.deletedFor = Array.isArray(m.deletedFor) ? m.deletedFor : [];
      if (!m.deletedFor.includes(userId)) m.deletedFor.push(userId);
    }

    res.json(m);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Unsend Message ---
export const unsendMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    if (!messageId) return res.status(400).json({ message: "No messageId" });

    let m;
    if (isDbConnected() && mongoose.connection.readyState === 1) {
      m = await Message.findById(messageId);
      if (!m) return res.status(404).json({ message: "Not found" });
      if (String(m.from) !== String(req.user._id)) return res.status(403).json({ message: "Not allowed" });
      m = await Message.findByIdAndUpdate(messageId, { isUnsent: true, text: "" }, { new: true });
    } else {
      m = messageStore.messages.find(x => x._id === messageId);
      if (!m) return res.status(404).json({ message: "Not found" });
      if (String(m.from) !== String(req.user._id)) return res.status(403).json({ message: "Not allowed" });
      m.isUnsent = true;
      m.text = "";
    }

    // Emit via socket
    try {
      const io = req.app?.locals?.io;
      const userSockets = req.app?.locals?.userSockets;
      if (io && userSockets && m) {
        [m.from, m.to].forEach(uid => {
          if (!sendQueue.has(uid)) sendQueue.set(uid, []);
          sendQueue.get(uid).push(m);
          setTimeout(() => flushQueue(io, userSockets, uid), 50);
        });
      }
    } catch (e) { console.error(e); }

    res.json(m);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Check if user is online ---
export const isUserOnline = async (userId) => {
  const ts = messageStore.presence[userId];
  if (!ts) return false;
  return (Date.now() - ts) <= PRESENCE_TTL_MS;
};

export const _exported_messageStore = messageStore;