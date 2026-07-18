import { Request, Response } from "express";
import Category from "../models/Category.js";

// GET /api/categories
export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await Category.find().populate("parentCategory");
        res.json({ categories });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch categories", error: error.message });
    }
};

// POST /api/categories
export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, slug, image, parentCategory } = req.body;
        
        if (!name || !slug) {
            return res.status(400).json({ message: "Name and slug are required" });
        }

        const category = await Category.create({ name, slug, image, parentCategory: parentCategory || null });
        res.status(201).json({ category });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Category slug must be unique" });
        }
        res.status(500).json({ message: "Failed to create category", error: error.message });
    }
};

// PUT /api/categories/:id
export const updateCategory = async (req: Request, res: Response) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) return res.status(404).json({ message: "Category not found" });
        res.json({ category });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update category", error: error.message });
    }
};

// DELETE /api/categories/:id
export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ message: "Category not found" });
        res.json({ message: "Category deleted" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete category", error: error.message });
    }
};
