import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"

export const data = new SlashCommandBuilder()
  .setName('fkoff')
  .setDescription('fks someone off')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
  .addUserOption(option => option.setName('user').setDescription('The user to fk off').setRequired(true))

/**
 * @param {{ options: { getChannel: (arg0: string) => any; }; send: (arg0: { content: string; ephemeral: boolean; }) => any; }} interaction
 */
export async function execute(interaction) {
  const user = interaction.options.getUser('user')
  await interaction.reply({ content: 'done', flags: MessageFlags.Ephemeral})  
  await interaction.channel.send(`${user} https://tenor.com/view/linus-linus-torvalds-nvidia-fuck-you-gif-18053606`)
  console.log(interaction.user.username, "fked off", user.username)
}