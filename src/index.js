import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import mongoose from "mongoose";
import compression from "compression";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { logger } from "./config/logger.js";
import profileRoute from "./routes/ProfileRoute.js";
import whiteboardroute from "./routes/WhiteboardRoute.js";
import bannerroute from './routes/Bannerroute.js';
import usermangentroute from './routes/userRoutes.js';
import adminprofile from './routes/profile.js';
import whiteb from './routes/whiteboard.routes.js';
import mentro from './routes/MentroRoute.js';
import dashboard from './routes/dashboardRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;



const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'https://admin.biharifoundersclub.com',
    'https://biharifoundersclub.com'
    // Add more as needed
];

// CORS Configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Upload-Id',
        'Content-Range',
        'X-Requested-With'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Apply CORS middleware - ONLY ONCE
app.use(cors(corsOptions));


// Increase payload size for large image uploads
app.use(express.json({
    limit: '50mb'
}));

app.use(express.urlencoded({
    extended: true,
    limit: '50mb'
}));

// Compression for responses
app.use(compression());

// Logging
app.use(morgan("combined", {
    stream: {
        write: (message) => logger.info(message.trim())
    },
    skip: (req) => req.url === '/health'
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes"
    }
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many upload attempts, please try again after 15 minutes"
    }
});

// Apply rate limiting
app.use("/api/", apiLimiter);
app.use("/api/bannerroute/upload", uploadLimiter);

// Trust proxy
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profileRoute", profileRoute);
app.use("/api/whiteboardroute", whiteboardroute);
app.use("/api/bannerroute", bannerroute);
app.use("/api/usermangentroute", usermangentroute);
app.use("/api/admin", adminprofile);
app.use("/api/whiteb", whiteb);
app.use("/api/mentro", mentro);
app.use("/api/dashboard", dashboard);

// API Documentation
app.get("/api-docs", (req, res) => {
    res.json({
        message: "API Documentation",
        upload_endpoints: {
            banner: {
                direct: "POST /api/bannerroute/ - Direct upload (< 5MB)",
                chunked: {
                    initiate: "POST /api/bannerroute/upload/initiate",
                    upload_chunk: "POST /api/bannerroute/upload/chunk",
                    complete: "POST /api/bannerroute/upload/complete"
                }
            }
        }
    });
});

// Root endpoint
app.get("/", (req, res) => {
    res.json({
        message: "Bihari Founder Club API is running",
        upload_support: "Chunked uploads up to 50MB"
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            logger.info(`
🚀 Server running on port ${PORT}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Upload limit: 50MB
✅ Chunk size: 5MB
✅ Time: ${new Date().toLocaleString()}
      `);
        });

    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();