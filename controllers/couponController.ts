import { Request, Response } from "express";
import Coupon from "../models/Coupon.js";

// POST /api/coupons/validate
export const validateCoupon = async (req: Request, res: Response) => {
    const { code, orderAmount } = req.body;

    if (!code || orderAmount === undefined) {
        return res.status(400).json({ message: "Code and order amount are required" });
    }

    try {
        const coupon = await Coupon.findOne({ code: code.toUpperCase() });
        
        if (!coupon) {
            return res.status(404).json({ message: "Invalid coupon code" });
        }

        if (!coupon.isActive) {
            return res.status(400).json({ message: "This coupon is no longer active" });
        }

        if (new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ message: "This coupon has expired" });
        }

        if (orderAmount < coupon.minSpend) {
            return res.status(400).json({ message: `Minimum spend of $${coupon.minSpend} required` });
        }

        // Calculate discount
        let discount = (orderAmount * coupon.discountPercentage) / 100;
        if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
            discount = coupon.maxDiscountAmount;
        }

        res.json({
            message: "Coupon applied successfully",
            discount: Number(discount.toFixed(2)),
            code: coupon.code,
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to validate coupon" });
    }
};

// POST /api/coupons (Admin only)
export const createCoupon = async (req: Request, res: Response) => {
    try {
        const coupon = await Coupon.create(req.body);
        res.status(201).json({ coupon });
    } catch (error) {
        res.status(500).json({ message: "Failed to create coupon" });
    }
};
