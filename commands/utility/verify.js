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

export async function button(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const [action, roleID] = interaction.customId.split(':')
    // Checks
    if (action !== 'verify') {console.log('action is not verify, it is:', action); return;}
    
    const token = crypto.randomUUID();
    console.log(token);

    await supabase.from('verification_tokens').insert({
      token,
      user_id: interaction.user.id,
      ip: null,
      verified: false,
    })

    const link = `https://brenttwo.github.io/verify?token=${token}`

    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle('Verification')
      .setDescription(`This server doesn't like alt accounts. So kindly verify very quickly to ensure you are a functioning human being. [Click here if the button doesn\'t work](${link})`)
      .setColor("Green")

    try {
      await interaction.user.send({ embeds: [embed] })
    } catch (error) { console.error(error.message); if (error.code === 10062) return; await interaction.editReply(`Couldn't DM you. Open this: ${link}`)}

}