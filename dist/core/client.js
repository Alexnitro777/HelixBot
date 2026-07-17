import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "discord.js";
import { config } from "../config/config.js";
import { logger } from "../logger/index.js";
import { db, guilds, guildModules } from "../db/index.js";
import { and, eq } from "drizzle-orm";
export class HelixClient extends Client {
    modules = new Map();
    commands = new Map();
    logger = logger;
    config = config;
    commandToModuleMap = new Map();
    moduleStatusCache = new Map();
    moduleSettingsCache = new Map();
    registeredListeners = [];
    constructor(options) {
        super(options);
        this.setupCoreEvents();
    }
    setupCoreEvents() {
        this.once("ready", async () => {
            this.logger.info(`Авторизован как ${this.user?.tag}`);
            const guildsList = await this.guilds.fetch();
            for (const [guildId] of guildsList) {
                await this.deployCommandsForGuild(guildId);
            }
            this.logger.info("Бот готов к работе");
        });
        this.on("guildCreate", async (guild) => {
            this.logger.info(`Бот добавлен на новый сервер: ${guild.name} (${guild.id})`);
            await this.ensureGuildExists(guild.id);
            await this.deployCommandsForGuild(guild.id);
        });
        this.on("interactionCreate", async (interaction) => {
            if (!interaction.isChatInputCommand())
                return;
            const command = this.commands.get(interaction.commandName);
            if (!command) {
                await interaction.reply({ content: "Неизвестная команда.", ephemeral: true }).catch(() => { });
                return;
            }
            const moduleId = this.commandToModuleMap.get(interaction.commandName);
            if (moduleId && interaction.guildId) {
                const isEnabled = await this.isModuleEnabled(interaction.guildId, moduleId);
                if (!isEnabled) {
                    await interaction.reply({ content: "Этот модуль не активирован на данном сервере.", ephemeral: true }).catch(() => { });
                    return;
                }
            }
            try {
                await command.execute(interaction, this);
            }
            catch (error) {
                this.logger.error(error, `Ошибка при выполнении команды ${interaction.commandName}`);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: "Произошла ошибка при выполнении этой команды.", ephemeral: true }).catch(() => { });
                }
            }
        });
    }
    async start() {
        await this.loadModules();
        await this.login(this.config.DISCORD_TOKEN);
    }
    async loadModules() {
        const currentFile = fileURLToPath(import.meta.url);
        const currentDir = path.dirname(currentFile);
        const modulesPath = path.join(currentDir, "../modules");
        try {
            await fs.mkdir(modulesPath, { recursive: true });
            const entries = await fs.readdir(modulesPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                try {
                    const indexPath = path.join(modulesPath, entry.name, "index.js");
                    try {
                        await fs.access(indexPath);
                    }
                    catch {
                        this.logger.warn(`Папка модуля ${entry.name} не содержит index.js`);
                        continue;
                    }
                    const fileUrl = pathToFileURL(indexPath).href;
                    const imported = await import(fileUrl);
                    const moduleInstance = imported.default;
                    if (!moduleInstance || !moduleInstance.id || !moduleInstance.name) {
                        this.logger.error(`Модуль ${entry.name} не экспортирует корректный модуль`);
                        continue;
                    }
                    await this.registerModule(moduleInstance);
                }
                catch (error) {
                    this.logger.error(error, `Не удалось загрузить модуль ${entry.name}`);
                }
            }
        }
        catch (error) {
            this.logger.error(error, "Не удалось загрузить папку модулей");
        }
    }
    async registerModule(moduleInstance) {
        const moduleId = moduleInstance.id;
        if (this.modules.has(moduleId)) {
            throw new Error(`Модуль ${moduleId} уже загружен`);
        }
        this.modules.set(moduleId, moduleInstance);
        if (moduleInstance.commands) {
            for (const command of moduleInstance.commands) {
                this.commands.set(command.data.name, command);
                this.commandToModuleMap.set(command.data.name, moduleId);
            }
        }
        if (moduleInstance.listeners) {
            for (const listener of moduleInstance.listeners) {
                const wrapper = async (...args) => {
                    try {
                        const guildId = this.getGuildIdFromArgs(args);
                        if (guildId) {
                            const isEnabled = await this.isModuleEnabled(guildId, moduleId);
                            if (!isEnabled)
                                return;
                        }
                        await listener.execute(this, ...args);
                    }
                    catch (error) {
                        this.logger.error(error, `Ошибка обработчика событий в модуле ${moduleId}`);
                    }
                };
                if (listener.once) {
                    this.once(listener.event, wrapper);
                }
                else {
                    this.on(listener.event, wrapper);
                }
                this.registeredListeners.push({
                    event: listener.event,
                    wrapper,
                    moduleId,
                });
            }
        }
        if (moduleInstance.onLoad) {
            try {
                await moduleInstance.onLoad(this);
            }
            catch (error) {
                this.logger.error(error, `Ошибка при выполнении onLoad для модуля ${moduleId}`);
            }
        }
        this.logger.info(`Загружен модуль ${moduleInstance.name} (${moduleId})`);
    }
    async unloadModule(moduleId) {
        const moduleInstance = this.modules.get(moduleId);
        if (!moduleInstance)
            return;
        if (moduleInstance.onUnload) {
            try {
                await moduleInstance.onUnload(this);
            }
            catch (error) {
                this.logger.error(error, `Ошибка при выполнении onUnload для модуля ${moduleId}`);
            }
        }
        const listenersToUnload = this.registeredListeners.filter((l) => l.moduleId === moduleId);
        for (const listener of listenersToUnload) {
            this.off(listener.event, listener.wrapper);
        }
        this.registeredListeners = this.registeredListeners.filter((l) => l.moduleId !== moduleId);
        if (moduleInstance.commands) {
            for (const command of moduleInstance.commands) {
                this.commands.delete(command.data.name);
                this.commandToModuleMap.delete(command.data.name);
            }
        }
        this.modules.delete(moduleId);
        this.logger.info(`Выгружен модуль ${moduleInstance.name} (${moduleId})`);
    }
    getGuildIdFromArgs(args) {
        for (const arg of args) {
            if (!arg || typeof arg !== "object")
                continue;
            if ("guildId" in arg && typeof arg.guildId === "string") {
                return arg.guildId;
            }
            if ("guild" in arg && arg.guild && typeof arg.guild === "object" && "id" in arg.guild) {
                return arg.guild.id;
            }
            if ("id" in arg && typeof arg.id === "string" && arg.constructor?.name === "Guild") {
                return arg.id;
            }
        }
        return null;
    }
    async ensureGuildExists(guildId) {
        try {
            await db.insert(guilds).values({ id: guildId });
        }
        catch (error) {
            if (error.code !== "ER_DUP_ENTRY") {
                throw error;
            }
        }
    }
    async isModuleEnabled(guildId, moduleId) {
        let guildCache = this.moduleStatusCache.get(guildId);
        if (!guildCache) {
            guildCache = new Map();
            this.moduleStatusCache.set(guildId, guildCache);
        }
        if (guildCache.has(moduleId)) {
            return guildCache.get(moduleId);
        }
        const [row] = await db
            .select({ enabled: guildModules.enabled })
            .from(guildModules)
            .where(and(eq(guildModules.guildId, guildId), eq(guildModules.moduleId, moduleId)))
            .limit(1);
        const enabled = row?.enabled ?? false;
        guildCache.set(moduleId, enabled);
        return enabled;
    }
    async getModuleSettings(guildId, moduleId) {
        let guildCache = this.moduleSettingsCache.get(guildId);
        if (!guildCache) {
            guildCache = new Map();
            this.moduleSettingsCache.set(guildId, guildCache);
        }
        if (guildCache.has(moduleId)) {
            return guildCache.get(moduleId);
        }
        const [row] = await db
            .select({ settings: guildModules.settings })
            .from(guildModules)
            .where(and(eq(guildModules.guildId, guildId), eq(guildModules.moduleId, moduleId)))
            .limit(1);
        const settings = row?.settings ?? null;
        guildCache.set(moduleId, settings);
        return settings;
    }
    async setModuleEnabled(guildId, moduleId, enabled) {
        await this.ensureGuildExists(guildId);
        await db
            .insert(guildModules)
            .values({ guildId, moduleId, enabled, settings: null })
            .onDuplicateKeyUpdate({ set: { enabled } });
        let guildCache = this.moduleStatusCache.get(guildId);
        if (!guildCache) {
            guildCache = new Map();
            this.moduleStatusCache.set(guildId, guildCache);
        }
        guildCache.set(moduleId, enabled);
        await this.deployCommandsForGuild(guildId);
    }
    async setModuleSettings(guildId, moduleId, settings) {
        await this.ensureGuildExists(guildId);
        await db
            .insert(guildModules)
            .values({ guildId, moduleId, enabled: true, settings })
            .onDuplicateKeyUpdate({ set: { settings } });
        let guildCache = this.moduleSettingsCache.get(guildId);
        if (!guildCache) {
            guildCache = new Map();
            this.moduleSettingsCache.set(guildId, guildCache);
        }
        guildCache.set(moduleId, settings);
    }
    async deployCommandsForGuild(guildId) {
        try {
            const enabledCommands = [];
            for (const [moduleId, moduleInstance] of this.modules.entries()) {
                const isEnabled = await this.isModuleEnabled(guildId, moduleId);
                if (isEnabled && moduleInstance.commands) {
                    for (const command of moduleInstance.commands) {
                        enabledCommands.push(command.data.toJSON());
                    }
                }
            }
            if (this.application) {
                await this.application.commands.set(enabledCommands, guildId);
                this.logger.info(`Зарегистрировано команд: ${enabledCommands.length} для сервера: ${guildId}`);
            }
        }
        catch (error) {
            this.logger.error(error, `Не удалось зарегистрировать команды для сервера: ${guildId}`);
        }
    }
}
