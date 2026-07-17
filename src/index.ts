import { GatewayIntentBits } from "discord.js";
import { HelixClient } from "./core/client.js";
import { logger } from "./logger/index.js";
import { pool, db } from "./db/index.js";
import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";

const client = new HelixClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

process.on("unhandledRejection", (reason) => {
  logger.fatal(reason, "Необработанное отклонение промиса (Unhandled Rejection)");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.fatal(error, "Необработанное исключение (Uncaught Exception)");
  process.exit(1);
});

async function main() {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    const migrationsFolder = path.join(currentDir, "db/migrations");

    logger.info("Запуск миграций базы данных...");
    await migrate(db, { migrationsFolder });
    logger.info("Миграции базы данных успешно применены");

    logger.info("Запуск бота...");
    await client.start();
  } catch (error) {
    logger.fatal(error, "Не удалось запустить бота");
    process.exit(1);
  }
}

async function shutdown() {
  logger.info("Получен сигнал завершения работы");
  try {
    client.destroy();
    logger.info("Сессия клиента Discord закрыта");
    
    await pool.end();
    logger.info("Пул подключений к базе данных закрыт");
    
    process.exit(0);
  } catch (error) {
    logger.error(error, "Ошибка при завершении работы");
    process.exit(1);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

main();
