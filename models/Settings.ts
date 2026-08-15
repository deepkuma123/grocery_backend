import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
    {
        homeBannerImage: { type: String, default: "" },
    },
    { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);
export default Settings;
