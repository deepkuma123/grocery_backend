import mongoose from "mongoose";
import "dotenv/config";
import Coupon from "./models/Coupon.js";

const seedCoupons = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL as string);
        
        await Coupon.deleteMany({});
        
        await Coupon.create({
            code: "WELCOME50",
            discountPercentage: 50,
            maxDiscountAmount: 20,
            minSpend: 10,
            isActive: true,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        });

        await Coupon.create({
            code: "FRESH10",
            discountPercentage: 10,
            maxDiscountAmount: null,
            minSpend: 50,
            isActive: true,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        console.log("Coupons Seeded Successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding coupons:", error);
        process.exit(1);
    }
};

seedCoupons();
