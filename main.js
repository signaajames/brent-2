import { Client, Events, GatewayIntentBits } from 'discord.js';
import { supabase } from './src/supabase.js'
import fs from 'node:fs'

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const commands = new Map()

const commandFiles = fs.readdirSync('./commands/utility').filter(f => f.endsWith('.js'))
const modules = await Promise.all(commandFiles.map(f => import(`./commands/utility/${f}`)))
for (const cmd of modules) {
    commands.set(cmd.data.name, cmd)
}

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const cmd = commands.get(interaction.commandName)
        if (!cmd) return
        try {
            await cmd.execute(interaction)
        } catch (e) {
            if (e.code === 10062) return
            console.error(`Command ${interaction.commandName} failed:`, e.message)
        }
    } else if (interaction.isButton()) {
        console.log(`[main] button interaction: ${interaction.customId}`)
        if (!interaction.customId.startsWith('verify:')) return;

        try {
            const cmd = commands.get('verify')
            if (!cmd?.button) { console.log(`[main] verify command not found`); return; }
            await cmd.button(interaction)
        } catch (e) {
            if (e.code === 10062) return
            console.error(`Button interaction ${interaction.customId} failed:`, e.message)
        }
    }
})

async function checkVerified() {
    const { data, error } = await supabase
        .from('verification_tokens')
        .select('*')
        .eq('verified', true)
        .eq('notified', false)

    if (error || !data?.length) return

    for (const row of data) {
        try {
            await fetch(
                `https://discord.com/api/v10/guilds/${row.guild_id}/members/${row.user_id}/roles/${row.role_id}`,
                { method: 'PUT', headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } }
            )

            const user = await client.users.fetch(row.user_id)
            await user.send('✅ You have been verified!')

            await supabase.from('verification_tokens').update({ notified: true }).eq('token', row.token)
        } catch (e) {
            console.error(`Failed to process verification for ${row.user_id}:`, e.message)
        }
    }
}

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`)
    setInterval(checkVerified, 10000)
})

client.login(process.env.BOT_TOKEN)
