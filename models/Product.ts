import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String, default: "" },
        price: { type: Number, required: true }, // Selling price
        costPrice: { type: Number, default: 0 },
        originalPrice: { type: Number, default: 0 }, // MRP
        image: { type: String, required: true },
        category: { type: String, required: true },
        unit: { type: String, default: "piece" },
        stock: { type: Number, default: 0 },
        isOrganic: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        rating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
        
        hasVariants: { type: Boolean, default: false },
        variants: [
            {
                sku: { type: String, required: true },
                unit: { type: String, required: true },
                price: { type: Number, required: true },
                costPrice: { type: Number, default: 0 },
                originalPrice: { type: Number, default: 0 },
                stock: { type: Number, default: 0 },
            }
        ]
    },
    {
        timestamps: true,
    }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
