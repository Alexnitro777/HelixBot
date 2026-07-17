import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, MessageFlags, } from "discord.js";
import { loadEmbeds } from "./registry.js";
const embeds = await loadEmbeds();
const buttonHandlers = new Map();
for (const def of embeds.values()) {
    for (const [customId, handler] of Object.entries(def.buttons ?? {})) {
        if (buttonHandlers.has(customId)) {
            throw new Error(`Дублирующийся customId кнопки: "${customId}" (embed ${def.name})`);
        }
        buttonHandlers.set(customId, handler);
    }
}
const embedModule = {
    id: "embed",
    name: "Embed",
    commands: [
        {
            data: new SlashCommandBuilder()
                .setName("запостить")
                .setDescription("Опубликовать готовый embed по имени")
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addStringOption((opt) => opt
                .setName("название")
                .setDescription("Какой embed отправить")
                .setRequired(true)
                .setAutocomplete(true))
                .addChannelOption((opt) => opt
                .setName("канал")
                .setDescription("Канал назначения (по умолчанию — текущий)")
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)),
            async execute(interaction, client) {
                const name = interaction.options.getString("название", true);
                const def = embeds.get(name);
                if (!def) {
                    await interaction.reply({
                        content: `❌ Embed «${name}» не найден.`,
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
                const target = (interaction.options.getChannel("канал") ?? interaction.channel);
                if (!target || !target.isTextBased() || !("send" in target)) {
                    await interaction.reply({
                        content: "❌ Не получилось отправить: выбери текстовый канал.",
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
                try {
                    const { embeds: embedList, components } = def.build();
                    await target.send({ embeds: embedList, components: components ?? [] });
                    await interaction.reply({
                        content: `✅ Embed «${name}» отправлен в <#${target.id}>.`,
                        flags: MessageFlags.Ephemeral,
                    });
                }
                catch (err) {
                    client.logger.error(err, "Ошибка при отправке embed-а");
                    await interaction.reply({
                        content: `❌ Ошибка при отправке: ${err instanceof Error ? err.message : String(err)}`,
                        flags: MessageFlags.Ephemeral,
                    });
                }
            },
        },
    ],
    listeners: [
        {
            event: "interactionCreate",
            async execute(client, interaction) {
                if (interaction.isButton()) {
                    const handler = buttonHandlers.get(interaction.customId);
                    if (handler) {
                        try {
                            await handler(interaction);
                        }
                        catch (err) {
                            client.logger.error(err, "Ошибка в обработчике кнопки");
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.reply({
                                    content: "❌ Что-то пошло не так.",
                                    flags: MessageFlags.Ephemeral,
                                });
                            }
                        }
                    }
                }
                else if (interaction.isAutocomplete()) {
                    if (interaction.commandName === "запостить") {
                        const focused = interaction.options.getFocused().toLowerCase();
                        const choices = [...embeds.values()]
                            .filter((e) => e.name.toLowerCase().includes(focused))
                            .slice(0, 25)
                            .map((e) => ({ name: `${e.name} — ${e.description}`.slice(0, 100), value: e.name }));
                        await interaction.respond(choices).catch(() => { });
                    }
                }
            },
        },
    ],
};
export default embedModule;
