import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        items: { type: mongoose.Schema.Types.Mixed, required: true },
        shippingAddress: { type: mongoose.Schema.Types.Mixed, required: true },
        paymentMethod: { type: String, default: "card" },
        subtotal: { type: Number, required: true },
        deliveryFee: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        couponCode: { type: String, default: null },
        total: { type: Number, required: true },
        totalCostPrice: { type: Number, default: 0 },
        status: { type: String, default: "Placed" },
        deliveryTimeSlot: { type: String, default: "ASAP" },
        statusHistory: { type: mongoose.Schema.Types.Mixed, default: [] },
        
        deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner", default: null },
        deliveryOtp: { type: String, default: "" },
        liveLocation: { type: mongoose.Schema.Types.Mixed, default: null },
        isPaid: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

orderSchema.virtual("user").get(function () {
    return this.userId;
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
