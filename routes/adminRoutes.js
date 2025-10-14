import express from "express";
import {
  adminLogin,
  requireAdmin,
  listUsers,
  approveVisibility,
  setVerify,
  setSuspend,
  deleteUser,
} from "../controllers/adminController.js";

const router = express.Router();

// Public admin login
router.post("/login", adminLogin);

// Protected routes
router.get("/users", requireAdmin, listUsers);
router.get("/pending-visibility", requireAdmin, listUsers); // use ?pendingVisibility=true
router.post("/approve-visibility/:userId", requireAdmin, approveVisibility);
router.post("/verify/:userId", requireAdmin, setVerify);
router.post("/suspend/:userId", requireAdmin, setSuspend);
router.delete("/users/:userId", requireAdmin, deleteUser);

export default router;


