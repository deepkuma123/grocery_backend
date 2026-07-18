import { Request, Response } from "express";
import StockNotification from "../models/StockNotification.js";

// POST /api/notifications/notify
export const requestStockNotification = async (req: Request, res: Response) => {
    try {
        const { productId, email } = req.body;
        
        if (!productId || !email) {
            return res.status(400).json({ message: "Product ID and Email are required" });
        }

        const existing = await StockNotification.findOne({ productId, email, status: "Pending" });
        if (existing) {
            return res.status(400).json({ message: "You are already subscribed for this product" });
        }

        const notification = await StockNotification.create({ productId, email });
        res.status(201).json({ message: "We will notify you when this is back in stock", notification });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create notification", error: error.message });
    }
};

// GET /api/notifications (Admin)
export const getStockNotifications = async (req: Request, res: Response) => {
    try {
        const notifications = await StockNotification.find().populate("productId");
        res.json({ notifications });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
    }
};
