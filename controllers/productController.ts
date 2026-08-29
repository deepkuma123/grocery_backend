import { Request, Response } from "express";
import Product from "../models/Product.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

import Category from "../models/Category.js";

const isAdmin = async (req: Request) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
        if (!token) return false;
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
        const user = await User.findById(decoded.id);
        if (!user) return false;
        const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()) : [];
        return adminEmails.includes(user.email.toLowerCase());
    } catch {
        return false;
    }
};

// GET /api/products/flash-deals
export const getFlashDeals = async (req: Request, res: Response) => {
    const admin = await isAdmin(req);
    const where: any = { $expr: { $gt: ["$originalPrice", "$price"] } };
    where.isDeleted = { $ne: true }; // Always hide deleted from flash deals

    const products = await Product.find(where).lean();

    const productsWithDiscount = products.map((p: any) => {
        const discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
        return { ...p, id: p._id, discount };
    });

    // Sort by highest discount percentage
    productsWithDiscount.sort((a, b) => b.discount - a.discount);

    if (!admin) {
        productsWithDiscount.forEach((p: any) => {
            delete p.costPrice;
            if (p.variants) p.variants.forEach((v: any) => delete v.costPrice);
        });
    }

    res.json({ products: productsWithDiscount.slice(0, 8) });
};

// GET /api/products
export const getProducts = async (req: Request, res: Response) => {
    const { category, search, minPrice, maxPrice, sort, page, limit, includeDeleted, organic } = req.query;

    const admin = await isAdmin(req);
    const where: any = {};
    const andConditions: any[] = [];

    if (!(admin && includeDeleted === 'true')) {
        andConditions.push({ isDeleted: { $ne: true } });
    }
    
    if (category && category !== "all") {
        const categories = await Category.find().lean();
        
        const getCategorySlugs = (slug: string): string[] => {
            const target = categories.find((c: any) => c.slug === slug);
            if (!target) return [slug];
            
            let slugs = [target.slug];
            const children = categories.filter((c: any) => c.parentCategory?.toString() === target._id.toString());
            for (const child of children) {
                slugs = slugs.concat(getCategorySlugs(child.slug));
            }
            return slugs;
        };

        const categorySlugs = getCategorySlugs(category as string);
        andConditions.push({ category: { $in: categorySlugs } });
    }
    if (search) {
        andConditions.push({
            $or: [
                { name: { $regex: search as string, $options: "i" } },
                { "variants.sku": { $regex: search as string, $options: "i" } },
                { "variants.unit": { $regex: search as string, $options: "i" } }
            ]
        });
    }
    if (organic === 'true') {
        andConditions.push({ isOrganic: true });
    }
    if (minPrice || maxPrice) {
        const priceQuery: any = {};
        if (minPrice) priceQuery.$gte = Number(minPrice);
        if (maxPrice) priceQuery.$lte = Number(maxPrice);
        andConditions.push({
            $or: [
                { price: priceQuery },
                { "variants.price": priceQuery }
            ]
        });
    }

    if (andConditions.length > 0) {
        where.$and = andConditions;
    }

    const sortOpt: any = {};
    if (sort === "price_asc") sortOpt.price = 1;
    else if (sort === "price_desc") sortOpt.price = -1;
    else if (sort === "rating") sortOpt.rating = -1;
    else if (sort === "name") sortOpt.name = 1;
    else sortOpt.createdAt = -1;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(where);
    const pages = Math.ceil(total / limitNum);

    const pipeline: any[] = [{ $match: where }];

    if (sort === "price_asc") {
        pipeline.push({
            $addFields: {
                effectivePrice: {
                    $min: {
                        $concatArrays: [["$price"], { $ifNull: ["$variants.price", []] }]
                    }
                }
            }
        });
        pipeline.push({ $sort: { effectivePrice: 1, _id: 1 } });
    } else if (sort === "price_desc") {
        pipeline.push({
            $addFields: {
                effectivePrice: {
                    $max: {
                        $concatArrays: [["$price"], { $ifNull: ["$variants.price", []] }]
                    }
                }
            }
        });
        pipeline.push({ $sort: { effectivePrice: -1, _id: -1 } });
    } else {
        pipeline.push({ $sort: { ...sortOpt, _id: -1 } });
    }

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    const products = await Product.aggregate(pipeline);

    const productsWithDiscount = products.map((p: any) => {
        const discount = p.originalPrice && p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
        
        if (p.variants && p.variants.length > 0) {
            p.variants = p.variants.filter((v: any) => {
                let keep = true;
                if (minPrice && v.price < Number(minPrice)) keep = false;
                if (maxPrice && v.price > Number(maxPrice)) keep = false;
                
                if (search && keep) {
                    const s = (search as string).toLowerCase();
                    const matchName = p.name && p.name.toLowerCase().includes(s);
                    if (!matchName) {
                        const matchSku = v.sku && v.sku.toLowerCase().includes(s);
                        const matchUnit = v.unit && v.unit.toLowerCase().includes(s);
                        if (!matchSku && !matchUnit) keep = false;
                    }
                }
                return keep;
            });
        }
        
        return { ...p, id: p._id, discount };
    });

    if (!admin) {
        productsWithDiscount.forEach((p: any) => {
            delete p.costPrice;
            if (p.variants) p.variants.forEach((v: any) => delete v.costPrice);
        });
    }

    res.json({ products: productsWithDiscount, pages, total });
};

// GET /api/products/:id

export const getProduct = async (req: Request, res: Response) => {
    const product: any = await Product.findById(req.params.id).lean();

    const admin = await isAdmin(req);
    if (!product || (!admin && product.isDeleted)) {
        res.status(404).json({ message: "Product not found" });
        return;
    }

    const discount = product.originalPrice && product.price ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

    if (!admin) {
        delete product.costPrice;
        if (product.variants) product.variants.forEach((v: any) => delete v.costPrice);
    }

    res.json({ product: { ...product, id: product._id, discount } });
};

// POST /api/products
export const createProduct = async (req: Request, res: Response) => {
    const product = await Product.create(req.body);
    res.status(201).json({ product });
};

// PUT /api/products/:id
export const updateProduct = async (req: Request, res: Response) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ product });
};

// DELETE /api/products/:id
export const deleteProduct = async (req: Request, res: Response) => {
    await Product.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ message: "Product deleted" });
};

// GET /api/products/:id/similar
export const getSimilarProducts = async (req: Request, res: Response) => {
    try {
        const product: any = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const admin = await isAdmin(req);
        const where: any = {
            category: product.category,
            _id: { $ne: product._id },
            isDeleted: { $ne: true }
        };

        const similarProducts = await Product.find(where)
            .limit(4)
            .lean();

        const productsWithDiscount = similarProducts.map((p: any) => {
            const discount = p.originalPrice && p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
            return { ...p, id: p._id, discount };
        });

        if (!admin) {
            productsWithDiscount.forEach((p: any) => {
                delete p.costPrice;
                if (p.variants) p.variants.forEach((v: any) => delete v.costPrice);
            });
        }

        res.json({ products: productsWithDiscount });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch similar products" });
    }
};
