
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { logger } from "./config/logger.js";
import profileRoute from "./routes/ProfileRoute.js";
import whiteboardroute from "./routes/WhiteboardRoute.js";
import bannerroute from './routes/Bannerroute.js'
import usermangentroute from './routes/userRoutes.js'
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.set('trust proxy', 1); 


app.use("/api/auth", authRoutes);
app.use("/api/profileRoute", profileRoute);
app.use("/api/whiteboardroute", whiteboardroute);
app.use("/api/bannerroute", bannerroute);
app.use("/api/usermangentroute", usermangentroute);

app.get("/", (req, res) => {
    res.send("bihari founder club API is running");
});

app.use(errorHandler);

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
        });
    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
