import mongoose from "mongoose";
import dns from "node:dns";
import "dotenv/config";

let cachedDb: typeof mongoose | null = null;

export const connectDB = async () => {
    if (cachedDb) {
        return cachedDb;
    }
    
    // Only apply DNS override locally, as it can cause timeouts on Vercel (AWS Lambda)
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
    }

    try {
        cachedDb = await mongoose.connect(process.env.DATABASE_URL as string);
        console.log("MongoDB Connected");
        return cachedDb;
    } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        throw error; // Throw error instead of process.exit in serverless
    }
};
