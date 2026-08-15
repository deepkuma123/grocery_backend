import { Request, Response } from "express";
import Settings from "../models/Settings.js";

export const getSettings = async (req: Request, res: Response) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json({ settings });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch settings" });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create(req.body);
        } else {
            settings = await Settings.findOneAndUpdate({}, req.body, { new: true });
        }
        res.json({ settings });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update settings" });
    }
};
