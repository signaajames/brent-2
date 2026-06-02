import { MessageFlags, SlashCommandBuilder } from "discord.js"

export const data = new SlashCommandBuilder()
  .setName('about')
  .setDescription('Provides information about the bot')
  .addChannelOption(option => option.setName('channel').setDescription('The channel to send the message in').setRequired(true))

/**
 * @param {{ options: { getChannel: (arg0: string) => any; }; send: (arg0: { content: string; ephemeral: boolean; }) => any; }} interaction
 */
export async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const channel = interaction.options.getChannel('channel')
  await channel.send('I\'m the second generation other purpose Brent(ley) bot, meant to verify users like double counter.')
}