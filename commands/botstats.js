const eris_version = require("eris/package.json").version;
const prettyms = require("pretty-ms");

async function embed(client) {
    let postgresVersion = await client.pg.query("SELECT version();");
    
    return {
        author: {
            name: `Node.js Version: ${process.version}`
        },
        fields: [{
            name: "Eris Version",
            value: eris_version,
            inline: true
        }, {
            name: "Postgres Version",
            value: postgresVersion.rows[0].version.split(" ")[1],
            inline: true
        }, {
            name: "Memory Usage",
            value: `${(process.memoryUsage().rss / (1024 * 1024)).toFixed(1)} MB`,
            inline: true
        }, {
            name: "Servers",
            value: client.bot.guilds.size,
            inline: true
        }, {
            name: "Users",
            value: client.bot.users.size,
            inline: true
        }, {
            name: "Uptime",
            value: prettyms(client.bot.uptime),
            inline: true
        }],
        timestamp: new Date().toJSON()
    };
}

async function exec(message, ctx) {
    let result = await embed(ctx.client);

    return ctx.embed(result);
}

module.exports = {
    name: "botstats",
    category: "owner",
    embed,
    exec
};
