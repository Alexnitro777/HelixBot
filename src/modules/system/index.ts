import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import type { HelixClient } from "../../core/client.js";
import type { HelixModule } from "../../core/types.js";

async function buildModulesPanel(client: HelixClient, guildId: string) {
  const embed = new EmbedBuilder()
    .setTitle("⚙️ Управление модулями сервера")
    .setColor(0x5865f2)
    .setTimestamp();

  const lines: string[] = [
    "> Выберите модуль в выпадающем меню ниже, чтобы включить или выключить его.\n",
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("system_toggle_module")
    .setPlaceholder("Выберите модуль для переключения...");

  let hasManageableModules = false;

  for (const [id, mod] of client.modules.entries()) {
    if (id === "system") continue;
    hasManageableModules = true;

    const enabled = await client.isModuleEnabled(guildId, id);
    const statusIcon = enabled ? "🟢" : "🔴";
    const statusText = enabled ? "Включён" : "Отключён";

    lines.push(`${statusIcon} **${mod.name}** (\`${id}\`) — *${statusText}*`);

    selectMenu.addOptions({
      label: mod.name,
      description: `Текущий статус: ${statusText}`,
      value: id,
      emoji: statusIcon,
    });
  }

  if (!hasManageableModules) {
    embed.setDescription("На сервере нет управляемых модулей.");
    return { embeds: [embed], components: [] };
  }

  embed.setDescription(lines.join("\n"));

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  return { embeds: [embed], components: [row] };
}

const systemModule: HelixModule = {
  id: "system",
  name: "Система",
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("модули")
        .setDescription("Панель управления модулями бота на сервере")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
      async execute(interaction, client) {
        if (!interaction.guildId) {
          await interaction.reply({
            content: "❌ Эта команда доступна только на сервере.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const panelData = await buildModulesPanel(client, interaction.guildId);
        await interaction.editReply(panelData);
      },
    },
  ],
  listeners: [
    {
      event: "interactionCreate",
      async execute(client, interaction) {
        if (
          interaction.isStringSelectMenu() &&
          interaction.customId === "system_toggle_module"
        ) {
          if (!interaction.guildId) return;

          const moduleId = interaction.values[0];
          if (!moduleId || moduleId === "system") return;

          await interaction.deferUpdate();

          const currentStatus = await client.isModuleEnabled(
            interaction.guildId,
            moduleId,
          );
          await client.setModuleEnabled(
            interaction.guildId,
            moduleId,
            !currentStatus,
          );

          const panelData = await buildModulesPanel(client, interaction.guildId);
          await interaction.editReply(panelData);
        }
      },
    },
  ],
};

export default systemModule;
