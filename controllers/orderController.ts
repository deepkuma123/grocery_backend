import { Request, Response } from "express";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Coupon from "../models/Coupon.js";
import { inngest } from "../inngest/index.js";
import Stripe from "stripe";

// Create order
// POST /api/orders
export const createOrder = async (req: Request, res: Response) => {
    const { items, shippingAddress, paymentMethod, couponCode, deliveryTimeSlot } = req.body;

    // Check if order items are empty
    if (!items || items.length === 0) {
        return res.status(400).json({ message: "No order items" });
    }

    // Look up actual prices from the database
    const productIds = items.map((i: any) => i.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap: Record<string, any> = {};

    products.forEach((p: any) => (productMap[p._id.toString()] = p));

    // Check if product is in stock
    for (const item of items) {
        const product = productMap[item.product];
        if (!product) return res.status(404).json({ message: "Product not found" });
        
        let stock = product.stock ?? 0;
        if (item.variantId && product.variants) {
            const variant = product.variants.find((v: any) => v._id.toString() === item.variantId);
            if (variant) stock = variant.stock ?? 0;
        }

        if (stock < item.quantity) {
            return res.status(404).json({ message: "Product out of stock" });
        }
    }

    const orderItems = items.map((item: any) => {
        const dbProduct = productMap[item.product];
        if (!dbProduct) throw new Error(`Product ${item.product} not found`);

        let price = dbProduct.price;
        let costPrice = dbProduct.costPrice || 0;
        let name = dbProduct.name;
        let unit = dbProduct.unit;
        
        if (item.variantId && dbProduct.variants) {
            const variant = dbProduct.variants.find((v: any) => v._id.toString() === item.variantId);
            if (variant) {
                price = variant.price;
                costPrice = variant.costPrice || 0;
                name = `${dbProduct.name} - ${variant.unit}`;
                unit = variant.unit;
            }
        }

        return {
            product: dbProduct._id,
            variantId: item.variantId || null,
            name: name,
            image: dbProduct.image,
            price: price,
            costPrice: costPrice,
            quantity: item.quantity,
            unit: unit,
        };
    });

    const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const totalCostPrice = orderItems.reduce((sum: number, item: any) => sum + item.costPrice * item.quantity, 0);
    
    let discount = 0;
    if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
        if (coupon && new Date(coupon.expiryDate) > new Date() && subtotal >= coupon.minSpend) {
            discount = (subtotal * coupon.discountPercentage) / 100;
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }
        }
    }

    const deliveryFee = subtotal > 20 ? 0 : 1.99;
    const tax = Math.round((subtotal - discount) * 0.08 * 100) / 100;
    const total = Math.round((subtotal - discount + deliveryFee + tax) * 100) / 100;

    const order = await Order.create({
        userId: req.user!.id,
        items: orderItems,
        shippingAddress,
        paymentMethod,
        subtotal,
        discount: Math.round(discount * 100) / 100,
        couponCode: discount > 0 ? couponCode.toUpperCase() : null,
        deliveryFee,
        tax,
        total,
        totalCostPrice,
        deliveryTimeSlot: deliveryTimeSlot || "ASAP",
        statusHistory: [{ status: "Placed", note: "Order placed successfully", timestamp: new Date() }],
    });

    if (paymentMethod === "card") {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

        // create session
        const session = await stripe.checkout.sessions.create({
            success_url: `${req.headers.origin}/orders?clearCart=true`,
            cancel_url: `${req.headers.origin}/checkout`,
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Payment Groceries",
                        },
                        unit_amount: Math.round(total * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            metadata: { orderId: order._id.toString() },
        });
        return res.json({ url: session.url });
    }

    res.json({ order });

    // Decrease stock
    for (const item of orderItems) {
        if (item.variantId) {
            await Product.updateOne({ _id: item.product, "variants._id": item.variantId }, { $inc: { "variants.$.stock": -item.quantity } });
        } else {
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
        }
    }

    // Send stock update events for each product in the order
    try {
        for (const item of orderItems) {
            await inngest.send({ name: "inventory/stock.updated", data: { productId: item.product } });
        }
        await inngest.send({ name: "order/placed", data: { orderId: order._id.toString() } });
    } catch (inngestErr) {
        console.error("Inngest send error:", inngestErr);
    }
};

// Get user's orders
// GET /api/orders
export const getUserOrders = async (req: Request, res: Response) => {
    const { status } = req.query;

    const where: any = {
        userId: req.user!.id,
        $nor: [{ paymentMethod: "card", isPaid: false }],
    };

    if (status && status !== "all") {
        where.status = status;
    }

    const orders = await Order.find(where)
        .populate("deliveryPartnerId", "name phone")
        .sort({ createdAt: -1 });

    res.json({ orders });
};

// Get single order
// GET /api/orders/:id
export const getOrder = async (req: Request, res: Response) => {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.id })
        .populate("deliveryPartnerId", "name phone avatar vehicleType");

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }
    res.json({ order });
};

// Update order status (admin)
// PUT /api/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response) => {
    const { status, note } = req.body;
    const order: any = await Order.findById(req.params.id);

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []) as any[];
    history.push({ status, note: note || `Order ${status.toLowerCase()}`, timestamp: new Date() });

    const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        { status, statusHistory: history },
        { new: true }
    );

    res.json({ order: updatedOrder });
};

// Get all orders (admin)
// GET /api/orders/all
export const getAllOrders = async (req: Request, res: Response) => {
    const orders = await Order.find({ $nor: [{ paymentMethod: "card", isPaid: false }] })
        .populate("userId", "name email")
        .populate("deliveryPartnerId", "name phone email")
        .sort({ createdAt: -1 });

    res.json({ orders });
};

// Get Order Location
// GET /api/orders/:id/location
export const getOrderLocation = async (req: Request, res: Response) => {
    const order: any = await Order.findOne(
        { _id: req.params.id, userId: req.user!.id },
        "liveLocation status"
    );

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ liveLocation: order.liveLocation, status: order.status });
};
