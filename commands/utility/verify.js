import { SlashCommandBuilder } from "discord.js"

new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Sends the verify message in selected channel. Only use if you are sigma')
  .addChannelOption(option => option.setName('channel').setDescription('The channel to send the message in').setRequired(true))

// @ts-ignore
export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel')
  await channel.send('I\'m the second generation other purpose Brent(ley) bot, meant to verify users like double counter.')
  await interaction.send({ content: 'sent', ephemeral: true })
}