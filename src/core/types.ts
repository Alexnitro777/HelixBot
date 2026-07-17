import {
  ChatInputCommandInteraction,
  ClientEvents,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { HelixClient } from "./client.js";

export interface HelixCommand {
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute(interaction: ChatInputCommandInteraction, client: HelixClient): Promise<void> | void;
}

export interface HelixListener<K extends keyof ClientEvents = keyof ClientEvents> {
  event: K;
  once?: boolean;
  execute(client: HelixClient, ...args: ClientEvents[K]): Promise<void> | void;
}

export interface HelixModule {
  id: string;
  name: string;
  commands?: HelixCommand[];
  listeners?: HelixListener<any>[];
  onLoad?(client: HelixClient): Promise<void> | void;
  onUnload?(client: HelixClient): Promise<void> | void;
}
