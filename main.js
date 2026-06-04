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
    console.log(`[poll] checking for verified rows...`)
    const { data, error } = await supabase
        .from('verification_tokens')
        .select('*')
        .eq('verified', true)
        .eq('notified', false)

    if (error) { console.error(`[poll] query error:`, error); return }
    if (!data?.length) { console.log(`[poll] no rows found`); return }

    console.log(`[poll] found ${data.length} row(s) to process`)
    for (const row of data) {
        console.log(`[poll] processing user=${row.user_id} role=${row.role_id} ip=${row.ip}`)
        try {
            const { data: dupes } = await supabase
                .from('verification_tokens')
                .select('user_id')
                .eq('ip', row.ip)
                .eq('verified', true)
                .neq('user_id', row.user_id)

            if (dupes && dupes.length > 0) {
                console.log(`[poll] duplicate IP (${row.ip}) flagged for user=${row.user_id}`)
                await supabase.from('verification_tokens').update({ notified: true }).eq('token', row.token)
                continue
            }

            const res = await fetch(
                `https://discord.com/api/v10/guilds/${row.guild_id}/members/${row.user_id}/roles/${row.role_id}`,
                { method: 'PUT', headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } }
            )
            console.log(`[poll] role assign status: ${res.status}`)

            if (!res.ok) {
                console.error(`[poll] failed to assign role: ${res.status} ${res.statusText}`)
                continue
            }

            const user = await client.users.fetch(row.user_id)
            await user.send('✅ You have been verified!')
            console.log(`[poll] DM sent`)

            await supabase.from('verification_tokens').update({ notified: true }).eq('token', row.token)
            console.log(`[poll] marked notified`)
        } catch (e) {
            console.error(`[poll] failed for ${row.user_id}:`, e.message)
        }
    }
}

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`)
    setInterval(checkVerified, 10000)
})

client.login(process.env.BOT_TOKEN)
