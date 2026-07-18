import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        phone: { type: String, default: "" },
        avatar: { type: String, default: "" },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

userSchema.virtual("addresses", {
    ref: "Address",
    localField: "_id",
    foreignField: "userId",
});

const User = mongoose.model("User", userSchema);
export default User;
