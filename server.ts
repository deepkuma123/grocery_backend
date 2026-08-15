import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import authRouter from "./routes/authRoutes.js";
import productRouter from "./routes/productRoutes.js";
import uploadRouter from "./routes/uploadRoutes.js";
import addressRouter from "./routes/addressRoutes.js";
import orderRouter from "./routes/orderRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import cartRouter from "./routes/cartRoutes.js";
import wishlistRouter from "./routes/wishlistRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import couponRouter from "./routes/couponRoutes.js";
import categoryRouter from "./routes/categoryRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import settingsRouter from "./routes/settingsRoutes.js";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import deliveryPartnerRouter from "./routes/deliveryPartnerRoutes.js";
import { stripeWebhook } from "./controllers/webhooks.js";

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: true, credentials: true, optionsSuccessStatus: 200 }));

const io = new Server(httpServer, {
    cors: {
        origin: true,
        credentials: true,
    },
});

app.locals.io = io; // Make io accessible in controllers if needed

io.on("connection", (socket) => {
    console.log("A user connected via WebSocket:", socket.id);

    // Join order tracking room
    socket.on("joinOrder", (orderId) => {
        socket.join(`order_${orderId}`);
        console.log(`Socket ${socket.id} joined room order_${orderId}`);
    });

    // Handle incoming live location updates from delivery partner apps
    socket.on("updateLocation", (data) => {
        const { orderId, lat, lng } = data;
        // Broadcast the location to anyone else in the room (like the customer)
        io.to(`order_${orderId}`).emit("locationUpdate", { lat, lng });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

app.post("/api/stripe", express.raw({ type: "application/json" }), stripeWebhook);

// Security Middlewares
app.use(helmet());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api/", apiLimiter);

app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT || 5000;
connectDB();

app.get("/", (req: Request, res: Response) => {
    res.send("Server is Live!");
});
app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/orders", orderRouter);
app.use("/api/admin", adminRouter);
app.use("/api/delivery", deliveryPartnerRouter);
app.use("/api/cart", cartRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/coupons", couponRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/inngest", serve({ client: inngest, functions }));

// Error handling
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    console.error(error);
    res.status(500).json({ message: error.message });
});

if (process.env.NODE_ENV !== "production") {
    httpServer.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}

export default app;
