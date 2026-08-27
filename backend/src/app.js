import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";

import barcodeRoutes from "./routes/barcodeRoutes.js";
import excelRoutes from "./routes/excelRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import announcementBarRoutes from "./routes/announcementBarRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import storeHoursRoutes from "./routes/storeHoursRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import geocodingRoutes from "./routes/geocodingRoutes.js";
import closureDateRoutes from "./routes/closureDateRoutes.js";
import fontRoutes from "./routes/fontRoutes.js";
import userRoutes from "./routes/users.js";
import swaggerUi from "swagger-ui-express"
import swaggerDocument from "" with {type: "json"}

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    // Permitir envío de cookies y credenciales
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get("/ping", (req, res) => {
  res.json({ status: "OK", message: "Pong" });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/barcodes", barcodeRoutes);
app.use("/api/excel", excelRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/announcement-bar", announcementBarRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/store-hours", storeHoursRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/geocoding", geocodingRoutes);
app.use("/api/closure-dates", closureDateRoutes);
app.use("/api/fonts", fontRoutes);

app.use(notFound);
app.use(errorHandler);

app.use("/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
)

export default app;
