import express from "express";
import { getWishlist, toggleWishlist } from "../controllers/wishlistController.js";
import auth from "../middleware/auth.js";

const wishlistRouter = express.Router();

wishlistRouter.use(auth); // Require authentication for all wishlist routes

wishlistRouter.get("/", getWishlist);
wishlistRouter.post("/toggle", toggleWishlist);

export default wishlistRouter;
