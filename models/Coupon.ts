import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        discountPercentage: {
            type: Number,
            required: true,
            min: 1,
            max: 100,
        },
        maxDiscountAmount: {
            type: Number,
            default: null, // If null, no limit on discount
        },
        minSpend: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Coupon", CouponSchema);
