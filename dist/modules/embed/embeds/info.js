import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, } from "discord.js";
const IMAGE_URL = "https://message.style/cdn/images/19ff44b737f293712cc2c96a452451257a70bc968acb3a5f4df87c0c6f6286b4.jfif";
const DONATE_URL = "https://discord.com/channels/1386381286754746439/1432841028766925010/1478132764137095288";
const RULES_URL = "https://discord.com/channels/1386381286754746439/1386382390691369000/1399019823161282610";
const EMOJI = {
    roles: "RPHBabyOwO:1395374987816337500",
    channels: "whitefur_blush:1480144879630946470",
    donate: "wyphere_cute:1480139806544625737",
    rules: "Fox_with_eggplant:1432120298626486292",
};
function withEmoji(button, emoji) {
    return emoji ? button.setEmoji(emoji) : button;
}
const info = {
    name: "info",
    description: "Информация Femboy Party",
    build: () => {
        const embed = new EmbedBuilder()
            .setDescription("бебебебебеббебе")
            .setImage(IMAGE_URL);
        const rows = [
            new ActionRowBuilder().addComponents(withEmoji(new ButtonBuilder()
                .setCustomId("info_roles")
                .setLabel("Рольки")
                .setStyle(ButtonStyle.Secondary), EMOJI.roles), withEmoji(new ButtonBuilder()
                .setCustomId("info_channels")
                .setLabel("Каналы")
                .setStyle(ButtonStyle.Secondary), EMOJI.channels), withEmoji(new ButtonBuilder()
                .setLabel("Донатики")
                .setStyle(ButtonStyle.Link)
                .setURL(DONATE_URL), EMOJI.donate), withEmoji(new ButtonBuilder()
                .setLabel("Правила")
                .setStyle(ButtonStyle.Link)
                .setURL(RULES_URL), EMOJI.rules)),
        ];
        return { embeds: [embed], components: rows };
    },
    buttons: {
        info_roles: async (interaction) => {
            const embed = new EmbedBuilder()
                .setTitle("Рольки")
                .setDescription("бебебебебебе")
                .setColor(0x5865f2);
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        },
        info_channels: async (interaction) => {
            const embed = new EmbedBuilder()
                .setTitle("Каналы")
                .setDescription("бебебебебебе")
                .setColor(0x5865f2);
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        },
    },
};
export default info;
