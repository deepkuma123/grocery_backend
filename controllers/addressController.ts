import { Request, Response } from "express";
import Address from "../models/Address.js";

// Get user addresses
// GET /api/addresses
export const getAddresses = async (req: Request, res: Response) => {
    const addresses = await Address.find({ userId: req.user!.id }).sort({ createdAt: 1 });
    res.json({ addresses });
};

// Add address
// POST /api/addresses
export const addAddress = async (req: Request, res: Response) => {
    const { label, address, city, state, zip, isDefault, lat, lng } = req.body;

    // Require coordinates
    if (lat == null || lng == null) {
        return res.status(400).json({ message: "Location coordinates are required. Please allow location access." });
    }

    const currentAddresses = await Address.find({ userId: req.user!.id });

    let makeDefault = isDefault;
    if (currentAddresses.length === 0) makeDefault = true;

    if (makeDefault) {
        await Address.updateMany({ userId: req.user!.id }, { isDefault: false });
    }

    await Address.create({
        userId: req.user!.id,
        label,
        address,
        city,
        state,
        zip,
        isDefault: makeDefault,
        lat: Number(lat),
        lng: Number(lng),
    });

    const addresses = await Address.find({ userId: req.user!.id }).sort({ createdAt: 1 });
    res.status(201).json({ addresses });
};

// Update address
// PUT /api/addresses/:id
export const updateAddress = async (req: Request, res: Response) => {
    const { label, address, city, state, zip, isDefault, lat, lng } = req.body;

    // Require coordinates
    if (lat == null || lng == null) {
        return res.status(400).json({ message: "Location coordinates are required. Please allow location access." });
    }

    if (isDefault) {
        await Address.updateMany({ userId: req.user!.id }, { isDefault: false });
    }

    const data: any = {};
    if (label) data.label = label;
    if (address) data.address = address;
    if (city) data.city = city;
    if (state) data.state = state;
    if (zip) data.zip = zip;
    if (isDefault !== undefined) data.isDefault = isDefault;
    if (lat != null) data.lat = Number(lat);
    if (lng != null) data.lng = Number(lng);

    try {
        await Address.findByIdAndUpdate(req.params.id, data);
    } catch (err) {
        return res.status(404).json({ message: "Address not found" });
    }

    const addresses = await Address.find({ userId: req.user!.id }).sort({ createdAt: 1 });

    res.json({ addresses });
};

// Delete address
// DELETE /api/addresses/:id
export const deleteAddress = async (req: Request, res: Response) => {
    try {
        await Address.findByIdAndDelete(req.params.id);
    } catch (err: any) {
        console.log(err.message);
    }

    const addresses = await Address.find({ userId: req.user!.id }).sort({ createdAt: 1 });

    res.json({ addresses });
};
