async function exec(message, ctx) {
    let res, rows;
    if (ctx.options[0] == "all") {
        schema = await ctx.client.pg.query("SELECT column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'usage';");

        rows = {};

        for (let row of schema.rows) {
            if (row.column_name == "guilds") continue;

            let res = await ctx.client.pg.query(`SELECT SUM(${row.column_name}) FROM usage;`);

            rows[row.column_name] = res.rows[0].sum;
        }
    } else {
        res = await ctx.client.pg.query({
            text: "SELECT * FROM usage WHERE guild = $1;", 
            values: [message.channel.guild.id]
        });
        rows = res.rows[0];
        delete rows.guild;
    }

    let cmds = Object.values(ctx.client.commands);

    let categories = cmds
        .map((command) => command.category)
        .filter((item, index, array) => array.indexOf(item) === index)
        .filter((item) => item)
        .sort();

    let msg = categories.map((category) => {
        let commands = cmds
            .filter((command) => command.category == category)
            .map((command) => `${command.name}: \`${rows[command.name]}\``)
            .join(", ");

        return `**${category}:** ${commands}`;
    });

    if (cmds.find((command) => !command.category)) {
        let commands = cmds
            .filter((command) => !command.category)
            .map((command) => `${command.name}: \`${rows[command.name]}\``)
            .join(", ");

        msg.push(`**uncategorized:** ${commands}`);
    }

    return ctx.send(msg.join("\n"));
}

module.exports = {
    name: "usage",
    category: "utility",
    exec
};
