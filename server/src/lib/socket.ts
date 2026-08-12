import { Server } from "socket.io";
import { ALLOWED_ORIGINS } from "../config/env.js";
import { logger } from "./logger.js";

// Constructed standalone (no httpServer yet) so this module has no dependency on
// index.ts/app bootstrap — route files can import `io` directly without a circular
// import. index.ts calls `io.attach(httpServer)` once the HTTP server exists.
export const io = new Server({
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, origin);
      }
      return callback(new Error("CORS policy violation: Origin not allowed"));
    },
    credentials: true,
  },
});

io.on("connection", (socket) => {
  logger.info(`🔌 Client connected to Socket.IO: ${socket.id}`);
  socket.on("disconnect", () => {
    logger.info(`🔌 Client disconnected: ${socket.id}`);
  });
});
