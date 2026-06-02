import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) {
        return;
    };

    const commandFile = await import(`./commands/utility/${interaction.commandName}.js`);
    await commandFile.execute(interaction);
})

client.once(Events.ClientReady, (readyClient) => {
    try {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    } catch (e) {
        console.error(e)
    }
});

client.login(process.env.BOT_TOKEN);
