import express from "express";
import { validateCoupon, createCoupon } from "../controllers/couponController.js";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";

const couponRouter = express.Router();

couponRouter.post("/validate", auth, validateCoupon);
couponRouter.post("/", auth, admin, createCoupon);

export default couponRouter;
