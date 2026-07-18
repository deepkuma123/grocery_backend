import express from "express";
import { createCategory, deleteCategory, getCategories, updateCategory } from "../controllers/categoryController.js";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";

const categoryRouter = express.Router();

categoryRouter.get("/", getCategories);
categoryRouter.post("/", auth, admin, createCategory);
categoryRouter.put("/:id", auth, admin, updateCategory);
categoryRouter.delete("/:id", auth, admin, deleteCategory);

export default categoryRouter;
