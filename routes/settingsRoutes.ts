import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";

const settingsRouter = express.Router();

settingsRouter.get("/", getSettings);
settingsRouter.put("/", auth, admin, updateSettings);

export default settingsRouter;
