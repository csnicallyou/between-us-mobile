import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import type { Pool } from "pg";
import type { AppConfig } from "./config.js";
import { HttpError } from "./lib/http.js";
import { createMailer } from "./lib/mailer.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerPairRoutes } from "./routes/pairs.js";
import { registerEntryRoutes } from "./routes/entries.js";
import { registerMoodRoutes } from "./routes/moods.js";
import { registerAppearanceRoutes } from "./routes/appearance.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerDeviceRoutes } from "./routes/devices.js";
import { registerFeedbackRoutes } from "./routes/feedback.js";
import { registerMediaRoutes } from "./routes/media.js";
import { registerExportRoutes } from "./routes/exports.js";

export function buildApp(config: AppConfig, db: Pool) {
  const app = Fastify({
    trustProxy: config.TRUST_PROXY,
    logger: { level: config.NODE_ENV === "production" ? "info" : "debug", redact: ["req.headers.authorization", "req.headers.cookie", "body.password", "body.refreshToken", "body.token", "body.secret"] },
    bodyLimit: 1_048_576
  });

  app.register(helmet, { global: true, contentSecurityPolicy: false });
  app.register(cors, {
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Origin not allowed"), false);
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });
  app.register(rateLimit, { global: true, max: 120, timeWindow: "1 minute" });
  app.register(jwt, { secret: config.JWT_SECRET });
  app.register(multipart, { limits: { files: 1, fileSize: config.MAX_UPLOAD_BYTES, fields: 0 } });

  app.get("/health", async (_request, reply) => {
    try {
      await db.query("SELECT 1");
      return { status: "ok" };
    } catch {
      return reply.code(503).send({ error: { code: "UNAVAILABLE", message: "Service unavailable" } });
    }
  });

  const mailer = createMailer(config, app);

  app.register(async (api) => {
    registerAuthRoutes(api, db, config, mailer);
    registerUserRoutes(api, db);
    registerPairRoutes(api, db);
    registerEntryRoutes(api, db);
    registerMoodRoutes(api, db);
    registerAppearanceRoutes(api, db);
    registerChatRoutes(api, db);
    registerDeviceRoutes(api, db);
    registerFeedbackRoutes(api, db, config);
    registerMediaRoutes(api, db, config);
    registerExportRoutes(api, db);
  }, { prefix: "/v1" });

  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: { code: "NOT_FOUND", message: "Resource not found" } }));
  app.setErrorHandler((error, request, reply) => {
    const reportedStatus = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : undefined;
    const status = error instanceof HttpError ? error.statusCode : reportedStatus && reportedStatus < 500 ? reportedStatus : 500;
    const code = error instanceof HttpError ? error.code : status === 429 ? "RATE_LIMITED" : status < 500 ? "INVALID_REQUEST" : "INTERNAL_ERROR";
    if (status >= 500) request.log.error({ err: error }, "request failed");
    reply.code(status).send({ error: { code, message: error instanceof HttpError ? error.message : status === 429 ? "Too many requests" : status < 500 ? "Invalid request" : "Internal server error" } });
  });

  app.addHook("onClose", async () => db.end());
  return app;
}
