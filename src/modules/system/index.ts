import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import type { HelixModule } from "../../core/types.js";

const systemModule: HelixModule = {
  id: "system",
  name: "Система",
  commands: [
    {
      data: new SlashCommandBuilder()
        .setName("модули")
        .setDescription("Управление модулями бота на сервере")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((sub) =>
          sub
            .setName("список")
            .setDescription("Показать список всех модулей и их статус")
        )
        .addSubcommand((sub) =>
          sub
            .setName("включить")
            .setDescription("Включить модуль на сервере")
            .addStringOption((opt) =>
              opt
                .setName("название")
                .setDescription("Идентификатор модуля")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("выключить")
            .setDescription("Выключить модуль на сервере")
            .addStringOption((opt) =>
              opt
                .setName("название")
                .setDescription("Идентификатор модуля")
                .setRequired(true)
                .setAutocomplete(true)
            )
        ),
      async execute(interaction, client) {
        if (!interaction.guildId) {
          await interaction.reply({
            content: "❌ Эта команда доступна только на сервере.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (subcommand === "список") {
          const embed = new EmbedBuilder()
            .setTitle("⚙️ Модули бота")
            .setColor(0x5865f2);

          const lines: string[] = [];
          for (const [id, mod] of client.modules.entries()) {
            const enabled = await client.isModuleEnabled(guildId, id);
            const status = enabled ? "✅ Включён" : "❌ Выключен";
            lines.push(`• **${mod.name}** (\`${id}\`): ${status}`);
          }

          embed.setDescription(lines.join("\n") || "Нет загруженных модулей.");
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        const moduleId = interaction.options.getString("название", true);
        const mod = client.modules.get(moduleId);

        if (!mod) {
          await interaction.reply({
            content: `❌ Модуль «${moduleId}» не найден.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (subcommand === "включить") {
          await client.setModuleEnabled(guildId, moduleId, true);
          await interaction.reply({
            content: `✅ Модуль **${mod.name}** (\`${moduleId}\`) успешно **включён** на этом сервере.`,
            flags: MessageFlags.Ephemeral,
          });
        } else if (subcommand === "выключить") {
          if (moduleId === "system") {
            await interaction.reply({
              content: `⚠️ Системный модуль нельзя выключить.`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          await client.setModuleEnabled(guildId, moduleId, false);
          await interaction.reply({
            content: `❌ Модуль **${mod.name}** (\`${moduleId}\`) **выключён** на этом сервере.`,
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
        if (interaction.isAutocomplete() && interaction.commandName === "модули") {
          const focused = interaction.options.getFocused().toLowerCase();
          const choices = [...client.modules.values()]
            .filter((m) => m.id.toLowerCase().includes(focused) || m.name.toLowerCase().includes(focused))
            .map((m) => ({ name: `${m.name} (${m.id})`, value: m.id }))
            .slice(0, 25);
          await interaction.respond(choices).catch(() => {});
        }
      },
    },
  ],
};

export default systemModule;
