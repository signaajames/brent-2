import { Client, Events, GatewayIntentBits } from 'discord.js';
import { supabase } from './src/supabase.js'
import fs from 'node:fs'
import chalk from 'chalk'

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
            console.error(chalk.red(`Command ${interaction.commandName} failed:`), e.message)
        }
    } else if (interaction.isButton()) {
        console.log(chalk.magenta(`[main] button interaction: ${interaction.customId}`))
        if (!interaction.customId.startsWith('verify:')) return;

        try {
            const cmd = commands.get('verify')
            if (!cmd?.button) { console.log(chalk.magenta(`[main] verify command not found`)); return; }
            await cmd.button(interaction)
        } catch (e) {
            if (e.code === 10062) return
            console.error(chalk.red(`Button interaction ${interaction.customId} failed:`), e.message)
        }
    }
})

let polling = false

async function checkVerified() {
    if (polling) return
    polling = true
    console.log(chalk.yellow(`[poll] checking for verified rows...`))

    await supabase
        .from('verification_tokens')
        .delete()
        .eq('verified', false)
        .or(`created_at.lt.${new Date(Date.now() - 10 * 60 * 1000).toISOString()},created_at.is.null`)

    const { data, error } = await supabase
        .from('verification_tokens')
        .select('*')
        .eq('verified', true)
        .eq('notified', false)

    if (error) { console.error(chalk.red(`[poll] query error:`), error); polling = false; return }
    if (!data?.length) { console.log(chalk.yellow(`[poll] no rows found`)); polling = false; return }

    console.log(chalk.yellow(`[poll] found ${data.length} row(s) to process`))
    for (const row of data) {
        console.log(chalk.yellow(`[poll] processing user=${row.user_id} role=${row.role_id} ip=${row.ip}`))
        try {
            const { data: existing } = await supabase
                .from('verification_tokens')
                .select('id')
                .eq('user_id', row.user_id)
                .eq('verified', true)
                .neq('token', row.token)

            if (existing && existing.length > 0) {
                console.log(chalk.yellow(`[poll] user already verified, flagging duplicate`))
                await supabase.from('verification_tokens').update({ notified: true, raw_ip: null }).eq('token', row.token)
                continue
            }

            const { data: dupes } = await supabase
                .from('verification_tokens')
                .select('user_id')
                .eq('ip', row.ip)
                .eq('verified', true)
                .neq('user_id', row.user_id)

            if (dupes && dupes.length > 0) {
                console.log(chalk.yellow(`[poll] duplicate IP (${row.ip}) flagged for user=${row.user_id}`))
                await supabase.from('verification_tokens').update({ notified: true, raw_ip: null }).eq('token', row.token)
                continue
            }

            const VPN_EXEMPT_USERS = ['1383762956881235990']

            if (row.raw_ip && !VPN_EXEMPT_USERS.includes(row.user_id)) {
                console.log(chalk.yellow(`[poll] checking vpn for user=${row.user_id}`))
                const vpnRes = await fetch(`https://proxycheck.io/v2/${row.raw_ip}?key=${process.env.PROXYCHECK_KEY}&vpn=1`)
                const vpnData = await vpnRes.json()
                const vpnInfo = vpnData[row.raw_ip]
                console.log(chalk.yellow(`[poll] proxycheck response: ${JSON.stringify(vpnData)}`))
                if (vpnInfo?.proxy === 'yes') {
                    console.log(chalk.yellow(`[poll] vpn detected, removing role for user=${row.user_id}`))
                    const delRes = await fetch(
                        `https://discord.com/api/v10/guilds/${row.guild_id}/members/${row.user_id}/roles/${row.role_id}`,
                        { method: 'DELETE', headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } }
                    )
                    console.log(chalk.yellow(`[poll] role remove status: ${delRes.status}`))
                    await supabase.from('verification_tokens').update({ notified: true, raw_ip: null }).eq('token', row.token)
                    continue
                }
            }

            const res = await fetch(
                `https://discord.com/api/v10/guilds/${row.guild_id}/members/${row.user_id}/roles/${row.role_id}`,
                { method: 'PUT', headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` } }
            )
            console.log(chalk.yellow(`[poll] role assign status: ${res.status}`))

            if (!res.ok) {
                console.error(chalk.red(`[poll] failed to assign role: ${res.status} ${res.statusText}`))
                continue
            }

            const user = await client.users.fetch(row.user_id)
            await user.send('✅ You have been verified!')
            console.log(chalk.green(`[poll] DM sent`))

            await supabase.from('verification_tokens').update({ notified: true }).eq('token', row.token)
            console.log(chalk.green(`[poll] marked notified`))

            if (row.raw_ip) {
                await supabase.from('verification_tokens').update({ raw_ip: null }).eq('token', row.token)
                console.log(chalk.green(`[poll] cleared raw_ip`))
            }
        } catch (e) {
            console.error(chalk.red(`[poll] failed for ${row.user_id}:`), e.message)
        }
    }
    polling = false
}

client.once(Events.ClientReady, (readyClient) => {
    console.log(chalk.green(`Ready! Logged in as ${readyClient.user.tag}`))
    setInterval(checkVerified, 5000)
})

client.login(process.env.BOT_TOKEN)
