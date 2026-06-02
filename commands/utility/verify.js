import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Sends the verify message in selected channel. Only use if you are sigma')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(option => option.setName('channel').setDescription('The channel to send the message in').setRequired(true))


// Embed:
const embed = new EmbedBuilder()
  .setTitle('Verify yourself NOW')
  .setDescription('Click the button below to get verified.')
  .setColor('#0791e7')
  // .setFooter({ text: 'Brent-2', iconURL: 'url' })
  // .setTimestamp()              // current time at footer
  // .addFields(
  // )

// Button:
const button = new ButtonBuilder()
  .setCustomId('verify_button')
  .setLabel('Verify')
  .setStyle(ButtonStyle.Primary)

const row = new ActionRowBuilder().addComponents(button)

/**
 * @param {{ options: { getChannel: (arg0: string) => any; }; send: (arg0: { content: string; ephemeral: boolean; }) => any; }} interaction
 */
export async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const channel = interaction.options.getChannel('channel')
  await channel.send({ embeds: [embed], components: [row] })
}