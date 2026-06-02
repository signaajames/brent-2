import { MessageFlags, SlashCommandBuilder } from "discord.js"

export const data = new SlashCommandBuilder()
  .setName('about')
  .setDescription('Provides information about the bot')
  .addChannelOption(option => option.setName('channel').setDescription('The channel to send the message in').setRequired(true))

async function getAboutInfo() {
    
    return 'I\'m the second generation other purpose Brent(ley) bot, meant to verify users like double counter.'
}

/**
 * @param {{ options: { getChannel: (arg0: string) => any; }; send: (arg0: { content: string; ephemeral: boolean; }) => any; }} interaction
 */
export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel')
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  await interaction.deleteReply();
  await channel.send(getAboutInfo())
}