import { Request, Response } from "express";
import Review from "../models/Review.js";
import Product from "../models/Product.js";

// POST /api/reviews
export const addReview = async (req: Request, res: Response) => {
    const { productId, rating, comment } = req.body;

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const existingReview = await Review.findOne({ user: req.user?.id, product: productId });
        if (existingReview) {
            return res.status(400).json({ message: "You have already reviewed this product" });
        }

        const review = await Review.create({
            user: req.user?.id,
            product: productId,
            rating: Number(rating),
            comment,
        });

        // Recalculate average rating
        const allReviews = await Review.find({ product: productId });
        const reviewCount = allReviews.length;
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

        product.rating = Number(avgRating.toFixed(1));
        product.reviewCount = reviewCount;
        await product.save();

        res.status(201).json({ message: "Review added successfully", review });
    } catch (error) {
        res.status(500).json({ message: "Failed to add review" });
    }
};

// GET /api/reviews/:productId
export const getProductReviews = async (req: Request, res: Response) => {
    try {
        const reviews = await Review.find({ product: req.params.productId })
            .populate("user", "name")
            .sort({ createdAt: -1 });

        // Map _id to id for frontend compatibility
        const formattedReviews = reviews.map((r: any) => {
            const raw = r.toObject();
            return {
                ...raw,
                id: raw._id,
                user: { ...raw.user, id: raw.user._id },
            };
        });

        res.json({ reviews: formattedReviews });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch reviews" });
    }
};
