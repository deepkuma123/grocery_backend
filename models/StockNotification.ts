import mongoose from "mongoose";

const stockNotificationSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        email: { type: String, required: true },
        status: { type: String, enum: ["Pending", "Notified"], default: "Pending" },
    },
    {
        timestamps: true,
    }
);

const StockNotification = mongoose.model("StockNotification", stockNotificationSchema);
export default StockNotification;
