import { Client, Events, GatewayIntentBits } from 'discord.js';
import fs from 'node:fs'

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const commands = new Map()

const commandFiles = fs.readdirSync('./commands/utility').filter(f => f.endsWith('.js'))
const modules = await Promise.all(commandFiles.map(f => import(`./commands/utility/${f}`)))
for (const cmd of modules) {
    commands.set(cmd.data.name, cmd)
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return

    const cmd = commands.get(interaction.commandName)
    if (!cmd) return

    try {
        await cmd.execute(interaction)
    } catch (e) {
        if (e.code === 10062) return
        console.error(`Command ${interaction.commandName} failed:`, e.message)
    }
})

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`)
})

client.login(process.env.BOT_TOKEN)
