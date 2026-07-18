import express from "express";
import { addReview, getProductReviews } from "../controllers/reviewController.js";
import auth from "../middleware/auth.js";

const reviewRouter = express.Router();

reviewRouter.get("/:productId", getProductReviews);
reviewRouter.post("/", auth, addReview);

export default reviewRouter;
