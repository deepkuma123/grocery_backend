import { Request, Response } from "express";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import DeliveryPartner from "../models/DeliveryPartner.js";
import bcrypt from "bcrypt";

// get admin dashboard data
export const getAdminStats = async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const [totalOrders, totalUsers, totalProducts, totalPartners, recentOrders, profitData, salesDataRaw, productsData] = await Promise.all([
        Order.countDocuments({ $nor: [{ paymentMethod: "card", isPaid: false }] }),
        User.countDocuments(),
        Product.countDocuments({ isDeleted: { $ne: true } }),
        DeliveryPartner.countDocuments(),
        Order.find({ $nor: [{ paymentMethod: "card", isPaid: false }] })
            .sort({ createdAt: -1 })
            .limit(8)
            .populate("userId", "name email")
            .populate("deliveryPartnerId", "name phone"),
        Order.aggregate([
            { $match: { status: "Delivered", $nor: [{ paymentMethod: "card", isPaid: false }] } },
            { $group: { _id: null, totalProfit: { $sum: { $subtract: ["$subtotal", { $ifNull: ["$totalCostPrice", 0] }] } } } }
        ]),
        Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, $nor: [{ paymentMethod: "card", isPaid: false }] } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$total" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        Product.find({ isDeleted: { $ne: true } }, 'hasVariants stock variants alertLimit')
    ]);

    const totalProfit = profitData.length > 0 ? profitData[0].totalProfit : 0;

    let outOfStock = 0;
    let lowStock = 0;

    productsData.forEach((p: any) => {
        const limit = p.alertLimit || 5;
        if (!p.hasVariants) {
            if (p.stock <= 0) outOfStock++;
            else if (p.stock <= limit) lowStock++;
        } else {
            if (p.variants && p.variants.length > 0) {
                if (p.variants.every((v: any) => v.stock <= 0)) {
                    outOfStock++;
                } else if (p.variants.some((v: any) => v.stock > 0 && v.stock <= limit)) {
                    lowStock++;
                }
            } else {
                outOfStock++;
            }
        }
    });

    // Process sales data to fill in missing days
    const salesData = [];
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - ((days - 1) - i));
        // Use local date string instead of ISO to prevent timezone shifts
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const existingData = salesDataRaw.find((s: any) => s._id === dateStr);
        salesData.push({
            date: dateStr,
            revenue: existingData ? existingData.revenue : 0,
            orders: existingData ? existingData.orders : 0
        });
    }

    res.json({ totalOrders, totalUsers, totalProducts, outOfStock, lowStock, totalPartners, recentOrders, totalProfit, salesData });
};

// get delivery partners list for admin
export const getDeliveryPartners = async (req: Request, res: Response) => {
    const partners = await DeliveryPartner.find().sort({ createdAt: -1 });
    res.json({ partners });
};

// create delivery partner profile
export const createDeliveryPartner = async (req: Request, res: Response) => {
    const { name, email, password, phone, vehicleType } = req.body;

    if (!name || !email || !password || !phone) {
        res.status(400).json({ message: "Please provide all required fields" });
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const partner = await DeliveryPartner.create({
        name, email: email.toLowerCase(), password: hashedPassword, phone, vehicleType
    });

    res.status(201).json({ partner });
};

// update delivery partner profile
export const updateDeliveryPartner = async (req: Request, res: Response) => {
    const { name, phone, vehicleType, isActive } = req.body;
    const data: any = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (vehicleType) data.vehicleType = vehicleType;
    data.isActive = isActive;

    try {
        const partner = await DeliveryPartner.findByIdAndUpdate(req.params.id, data, { new: true });
        res.json({ partner });
    } catch (error) {
        res.status(404).json({ message: "Partner not found" });
    }
};

// assign delivery partner for order
export const assignDeliveryPartner = async (req: Request, res: Response) => {
    const { partnerId } = req.body;

    const order = await Order.findById(req.params.id);

    const partner = await DeliveryPartner.findById(partnerId);

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    let status = order!.status;

    const history: any[] = Array.isArray(order!.statusHistory) ? order!.statusHistory : [];

    if (order!.status === "Placed" || order!.status === "Confirmed") {
        status = "Assigned";
        history.push({
            status: "Assigned",
            note: `Assigned to ${partner!.name}`,
            timestamp: new Date(),
        });
    }

    await Order.findByIdAndUpdate(order!._id, {
        deliveryPartnerId: partner!._id, deliveryOtp: otp, status, statusHistory: history 
    });

    res.json({ order });
};
