import pino from "pino";
import { config } from "../config/config.js";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
});
