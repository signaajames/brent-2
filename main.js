import { Client, Events, GatewayIntentBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
    try {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    } catch (e) {
        console.error(e)
    }
});

client.login(process.env.BOT_TOKEN);