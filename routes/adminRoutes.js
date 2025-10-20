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

// PUBLIC LOGIN
router.post("/login", adminLogin);

// PROTECTED ROUTES
router.get("/users", requireAdmin, listUsers);
router.get("/pending-visibility", requireAdmin, listUsers); // ?pendingVisibility=true
router.post("/approve-visibility/:userId", requireAdmin, approveVisibility);
router.post("/verify/:userId", requireAdmin, setVerify);
router.post("/suspend/:userId", requireAdmin, setSuspend);
router.delete("/users/:userId", requireAdmin, deleteUser);

export default router;
