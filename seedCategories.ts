import "dotenv/config";
import mongoose from "mongoose";
import Category from "./models/Category.js";
import { connectDB } from "./config/db.js";

const categoriesData = [
    {
        name: "Fruits & Vegetables",
        slug: "fruits-vegetables",
        image: "/categories/fruits_vegetables.png",
    },
    {
        name: "Personal Care",
        slug: "personal-care",
        image: "/categories/personal_care.png",
    },
    {
        name: "Pantry Staples",
        slug: "pantry-staples",
        image: "/categories/pantry_staples.png",
    },
    {
        name: "Bakery",
        slug: "bakery",
        image: "/categories/bakery.png",
    },
    {
        name: "Beverages",
        slug: "beverages",
        image: "/categories/drinks.png",
    },
    {
        name: "Meat & Seafood",
        slug: "meat-seafood",
        image: "/categories/meat_seafood.png",
    },
    {
        name: "Snacks",
        slug: "snacks",
        image: "/categories/snacks.png",
    },
    {
        name: "Frozen Foods",
        slug: "frozen-foods",
        image: "/categories/frozen_foods.png",
    },
    {
        name: "Baby Care",
        slug: "baby-care",
        image: "/categories/baby_care.png",
    },
    {
        name: "Dairy & Eggs",
        slug: "dairy-eggs",
        image: "/categories/dairy_eggs.png",
    }
];

const seed = async () => {
    try {
        await connectDB();
        await Category.deleteMany({});
        await Category.insertMany(categoriesData);
        console.log("Categories seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding categories:", error);
        process.exit(1);
    }
};

seed();
