import mongoose from "mongoose";

const CartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    variantId: {
        type: String,
        default: null,
    },
});

const CartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        items: [CartItemSchema],
    },
    { timestamps: true }
);

export default mongoose.model("Cart", CartSchema);
