import { mysqlTable, varchar, boolean, json, timestamp, primaryKey } from "drizzle-orm/mysql-core";
export const guilds = mysqlTable("guilds", {
    id: varchar("id", { length: 64 }).primaryKey(),
    createdAt: timestamp("created_at").defaultNow(),
});
export const guildModules = mysqlTable("guild_modules", {
    guildId: varchar("guild_id", { length: 64 }).references(() => guilds.id, { onDelete: "cascade" }),
    moduleId: varchar("module_id", { length: 64 }),
    enabled: boolean("enabled").default(false),
    settings: json("settings"),
}, (table) => ({
    pk: primaryKey({ columns: [table.guildId, table.moduleId] }),
}));
