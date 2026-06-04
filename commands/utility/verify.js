import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"
import { supabase } from '../../src/supabase.js'
import crypto from 'node:crypto'

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Sends the verify message in selected channel. Only use if you are sigma')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(option => option.setName('channel').setDescription('The channel to send the message in').setRequired(true))
  .addRoleOption(option => option.setName('role').setDescription('The role to give upon verification').setRequired(true))
/**
 * @param {{ options: { getChannel: (arg0: string) => any; }; send: (arg0: { content: string; ephemeral: boolean; }) => any; }} interaction
 */
export async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  const channel = interaction.options.getChannel('channel')
  const role = interaction.options.getRole('role')

  // Embed:
  const embed = new EmbedBuilder()
    .setTitle('Verification')
    .setDescription('Click the button to start the verification process. We do this to prevent people using an alt to evade bans. And to show you\'re a functioning human that isn\'t some 8 year old. This works pretty much exactly like **double counter**.')
    .setColor("Blue")

  // Button:
  const button = new ButtonBuilder()
    .setCustomId('verify:' + role.id)
    .setLabel('Verify')
    .setStyle(ButtonStyle.Primary)

  const row = new ActionRowBuilder().addComponents(button)

  await channel.send({ embeds: [embed], components: [row] })
  console.log(interaction.user.username, "sent the verify message in", channel.name)
}