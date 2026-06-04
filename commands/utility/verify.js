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

  export async function execute(interaction) {
  console.log(`[exec] /verify started by ${interaction.user.id}`)
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  console.log(`[exec] deferred reply`)
  const channel = interaction.options.getChannel('channel')
  const role = interaction.options.getRole('role')
  console.log(`[exec] channel=${channel.id} role=${role.id}`)

  const embed = new EmbedBuilder()
    .setDescription('Click the button to start the verification process. We do this to prevent people using an alt to evade bans. And to show you\'re a functioning human that isn\'t some 8 year old. This works pretty much exactly like **double counter**.')
    .setColor("Green")

  const button = new ButtonBuilder()
    .setCustomId('verify:' + role.id)
    .setLabel('Verify')
    .setStyle(ButtonStyle.Primary)

  const row = new ActionRowBuilder().addComponents(button)

  await channel.send({ embeds: [embed], components: [row] })
  console.log(`[exec] embed sent to ${channel.name}`)
}

export async function button(interaction) {
  console.log(`[btn] button clicked by ${interaction.user.id}, customId=${interaction.customId}`)
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  console.log(`[btn] deferred`)
  const [action, roleID] = interaction.customId.split(':')
  if (action !== 'verify') { console.log(`[btn] wrong action: ${action}`); return; }
  console.log(`[btn] roleID=${roleID}`)

  const token = crypto.randomUUID();
  console.log(`[btn] token=${token}`)

  console.log(`[btn] inserting into supabase...`)
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
    console.error(`[btn] supabase insert failed:`, insertError)
    await interaction.editReply('Failed to create verification token. Try again later.')
    return
  }
  console.log(`[btn] supabase insert done`)

  const link = `https://brenttwo.github.io/verify?token=${token}`

  const embed = new EmbedBuilder()
    .setDescription(`This server doesn't like alt accounts. So kindly verify very quickly to ensure you are a functioning human being.`)
    .setColor("Green")

  const button = new ButtonBuilder()
    .setLabel('Verify')
    .setURL(link)
    .setStyle(ButtonStyle.Link)

  const row = new ActionRowBuilder().addComponents(button)

  try {
    console.log(`[btn] sending DM...`)
    await interaction.user.send({ embeds: [embed], components: [row] })
    console.log(`[btn] DM sent`)
    await interaction.editReply('Check your DMs!')
    console.log(`[btn] editReply done`)
    await new Promise(r => setTimeout(r, 1000))
    await interaction.deleteReply()
  } catch (error) {
    console.error(`[btn] DM failed:`, error.message)
    await interaction.editReply(`Couldn't DM you. Open this: ${link}`)
  }
}
