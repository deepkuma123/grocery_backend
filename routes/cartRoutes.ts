import express from "express";
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from "../controllers/cartController.js";
import auth from "../middleware/auth.js";

const cartRouter = express.Router();

cartRouter.use(auth); // Require authentication for all cart routes

cartRouter.get("/", getCart);
cartRouter.post("/add", addToCart);
cartRouter.put("/update", updateCartItem);
cartRouter.delete("/remove/:productId", removeFromCart);
cartRouter.delete("/clear", clearCart);

export default cartRouter;
