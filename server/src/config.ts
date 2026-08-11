import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: booleanString.default("false"),
  JWT_SECRET: z.string().min(32),
  FEEDBACK_ENCRYPTION_KEY: z.string().transform((value, ctx) => {
    const key = Buffer.from(value, "base64");
    if (key.length !== 32) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "must decode to 32 bytes" });
      return z.NEVER;
    }
    return key;
  }),
  CORS_ORIGINS: z.string().default(""),
  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(20 * 1024 * 1024).default(5 * 1024 * 1024),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  TRUST_PROXY: booleanString.default("false"),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default("Между нами <no-reply@between-us.local>")
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.parse(env);
  return {
    ...parsed,
    corsOrigins: parsed.CORS_ORIGINS.split(",").map((item) => item.trim()).filter(Boolean)
  };
}
