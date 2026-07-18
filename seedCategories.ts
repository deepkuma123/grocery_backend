import "dotenv/config";
import mongoose from "mongoose";
import Category from "./models/Category.js";
import { connectDB } from "./config/db.js";

const categoriesData = [
    {
        name: "Fruits & Vegetables",
        slug: "fruits-vegetables",
        image: "/src/assets/fruits_vegetables.png",
    },
    {
        name: "Personal Care",
        slug: "personal-care",
        image: "/src/assets/personal_care.png",
    },
    {
        name: "Pantry Staples",
        slug: "pantry-staples",
        image: "/src/assets/pantry_staples.png",
    },
    {
        name: "Bakery",
        slug: "bakery",
        image: "/src/assets/bakery.png",
    },
    {
        name: "Beverages",
        slug: "beverages",
        image: "/src/assets/drinks.png",
    },
    {
        name: "Meat & Seafood",
        slug: "meat-seafood",
        image: "/src/assets/meat_seafood.png",
    },
    {
        name: "Snacks",
        slug: "snacks",
        image: "/src/assets/snacks.png",
    },
    {
        name: "Frozen Foods",
        slug: "frozen-foods",
        image: "/src/assets/frozen_foods.png",
    },
    {
        name: "Baby Care",
        slug: "baby-care",
        image: "/src/assets/baby_care.png",
    },
    {
        name: "Dairy & Eggs",
        slug: "dairy-eggs",
        image: "/src/assets/dairy_eggs.png",
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
