import express from "express";
import { requestStockNotification, getStockNotifications } from "../controllers/notificationController.js";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";

const notificationRouter = express.Router();

notificationRouter.post("/notify", requestStockNotification);
notificationRouter.get("/", auth, admin, getStockNotifications);

export default notificationRouter;
