import { Request, Response } from "express";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Generate JWT token
const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: "30d" });
};

// Check if user is admin
const getAdminStatus = (email: string | null | undefined): boolean => {
    if (!email) return false;
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()) : [];
    return adminEmails.includes(email.toLowerCase());
};

// Register
// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please provide all fields" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name, email: email.toLowerCase(), password: hashedPassword,
    });

    const token = generateToken(user.id);

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const userData: any = user.toObject();
    delete userData.password;
    userData.isAdmin = getAdminStatus(userData.email);

    res.status(201).json({ user: userData, token });
};

// Login
// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate("addresses");

    if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user.id);

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const userData: any = user.toObject();
    delete userData.password;
    userData.isAdmin = getAdminStatus(userData.email);

    res.json({ user: userData, token });
};

// Logout
// POST /api/auth/logout
export const logout = async (req: Request, res: Response) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    res.json({ message: "Logged out successfully" });
};
