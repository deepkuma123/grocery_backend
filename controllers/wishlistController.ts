import { Request, Response } from "express";
import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

// GET /api/wishlist
export const getWishlist = async (req: Request, res: Response) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user?.id }).populate("products");
        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user?.id, products: [] });
        }
        res.json({ wishlist: wishlist.products });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch wishlist" });
    }
};

// POST /api/wishlist/toggle
export const toggleWishlist = async (req: Request, res: Response) => {
    const { productId } = req.body;
    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        let wishlist = await Wishlist.findOne({ user: req.user?.id });
        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user?.id, products: [] });
        }

        const productIndex = wishlist.products.indexOf(productId);
        let added = false;
        
        if (productIndex > -1) {
            wishlist.products.splice(productIndex, 1);
        } else {
            wishlist.products.push(productId);
            added = true;
        }

        await wishlist.save();
        res.json({ added, message: added ? "Added to wishlist" : "Removed from wishlist" });
    } catch (error) {
        res.status(500).json({ message: "Failed to toggle wishlist" });
    }
};
