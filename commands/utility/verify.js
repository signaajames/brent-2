import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"
import { supabase } from '../../src/supabase.js'
import crypto from 'node:crypto'
import chalk from 'chalk'

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Sends the verify message in selected channel. Only use if you are sigma')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(option => option.setName('channel').setDescription('The channel to send the message in').setRequired(true))
  .addRoleOption(option => option.setName('role').setDescription('The role to give upon verification').setRequired(true))

  export async function execute(interaction) {
  console.log(chalk.cyan(`[exec] /verify started by ${interaction.user.id}`))
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  console.log(chalk.cyan(`[exec] deferred reply`))
  const channel = interaction.options.getChannel('channel')
  const role = interaction.options.getRole('role')
  console.log(chalk.cyan(`[exec] channel=${channel.id} role=${role.id}`))

  const embed = new EmbedBuilder()
    .setDescription("To gain access to the server, you must complete verification. The process works similarly to **Double Counter** and only takes a moment.\nClick **Verify** below to begin.")
    .setColor("Blue")

  const button = new ButtonBuilder()
    .setCustomId('verify:' + role.id)
    .setLabel('Verify')
    .setStyle(ButtonStyle.Primary)

  const row = new ActionRowBuilder().addComponents(button)

  await channel.send({ embeds: [embed], components: [row] })
  console.log(chalk.cyan(`[exec] embed sent to ${channel.name}`))
}

export async function button(interaction) {
  console.log(chalk.cyan(`[btn] button clicked by ${interaction.user.id}, customId=${interaction.customId}`))
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  console.log(chalk.cyan(`[btn] deferred`))
  const [action, roleID] = interaction.customId.split(':')
  if (action !== 'verify') { console.log(chalk.cyan(`[btn] wrong action: ${action}`)); return; }
  console.log(chalk.cyan(`[btn] roleID=${roleID}`))

  const { data: existing } = await supabase
    .from('verification_tokens')
    .select('id')
    .eq('user_id', interaction.user.id)
    .eq('verified', true)

  if (existing && existing.length > 0) {
    console.log(chalk.cyan(`[btn] user already verified`))
    await interaction.editReply('You are already verified!')
    return
  }

  const token = crypto.randomUUID();
  console.log(chalk.cyan(`[btn] token=${token}`))

  console.log(chalk.cyan(`[btn] inserting into supabase...`))
  const { error: insertError } = await supabase.from('verification_tokens').insert({
    token,
    user_id: interaction.user.id,
    role_id: roleID,
    guild_id: interaction.guildId,
    ip: null,
    verified: false,
    notified: false,
  })
  if (insertError) {
    console.error(chalk.red(`[btn] supabase insert failed:`), insertError)
    await interaction.editReply('Failed to create verification token. Try again later.')
    return
  }
  console.log(chalk.green(`[btn] supabase insert done`))

  const link = `https://brenttwo.github.io/verify?token=${token}`

  const dmEmbed = new EmbedBuilder()
    .setDescription(`This server is protected by Signaa, DrSteeve/James's cat. This process helps prevent alt accounts and other forms of abuse.`)
    .setColor(0x555555)

  const dmButton = new ButtonBuilder()
    .setLabel('Verify')
    .setURL(link)
    .setStyle(ButtonStyle.Link)

  const dmRow = new ActionRowBuilder().addComponents(dmButton)

  try {
    await interaction.user.send({ embeds: [dmEmbed], components: [dmRow] })
    await interaction.editReply('Check your DMs!')
    await new Promise(r => setTimeout(r, 1000))
    await interaction.deleteReply()
  } catch {
    await interaction.editReply({ embeds: [dmEmbed], components: [dmRow] })
  }
}
