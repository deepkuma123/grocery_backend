import { Request, Response } from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

// GET /api/cart
export const getCart = async (req: Request, res: Response) => {
    try {
        let cart = await Cart.findOne({ user: req.user?.id }).populate("items.product");
        if (!cart) {
            cart = await Cart.create({ user: req.user?.id, items: [] });
        }
        res.json({ cart });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch cart" });
    }
};

// POST /api/cart/add
export const addToCart = async (req: Request, res: Response) => {
    const { productId, quantity = 1, variantId } = req.body;
    try {
        const product = await Product.findById(productId);
        if (!product || product.stock < quantity) {
            return res.status(400).json({ message: "Product out of stock or not found" });
        }

        let cart = await Cart.findOne({ user: req.user?.id });
        if (!cart) {
            cart = await Cart.create({ user: req.user?.id, items: [] });
        }

        const existingItemIndex = cart.items.findIndex((item) => item.product.toString() === productId && item.variantId === (variantId || null));
        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity, variantId: variantId || null });
        }

        await cart.save();
        await cart.populate("items.product");
        res.json({ cart });
    } catch (error) {
        res.status(500).json({ message: "Failed to add to cart" });
    }
};

// PUT /api/cart/update
export const updateCartItem = async (req: Request, res: Response) => {
    const { productId, quantity, variantId } = req.body;
    try {
        let cart = await Cart.findOne({ user: req.user?.id });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const existingItemIndex = cart.items.findIndex((item) => item.product.toString() === productId && item.variantId === (variantId || null));
        if (existingItemIndex > -1) {
            if (quantity <= 0) {
                cart.items.splice(existingItemIndex, 1);
            } else {
                cart.items[existingItemIndex].quantity = quantity;
            }
            await cart.save();
            await cart.populate("items.product");
            res.json({ cart });
        } else {
            res.status(404).json({ message: "Item not found in cart" });
        }
    } catch (error) {
        res.status(500).json({ message: "Failed to update cart" });
    }
};

// DELETE /api/cart/remove/:productId
export const removeFromCart = async (req: Request, res: Response) => {
    try {
        let cart = await Cart.findOne({ user: req.user?.id });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const { variantId } = req.body; // Needs to be passed in body or query

        cart.items = cart.items.filter((item) => !(item.product.toString() === req.params.productId && item.variantId === (variantId || null)));
        await cart.save();
        await cart.populate("items.product");
        res.json({ cart });
    } catch (error) {
        res.status(500).json({ message: "Failed to remove from cart" });
    }
};

// DELETE /api/cart/clear
export const clearCart = async (req: Request, res: Response) => {
    try {
        let cart = await Cart.findOne({ user: req.user?.id });
        if (cart) {
            cart.items = [];
            await cart.save();
        }
        res.json({ message: "Cart cleared", cart });
    } catch (error) {
        res.status(500).json({ message: "Failed to clear cart" });
    }
};
