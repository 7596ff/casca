async function exec(message, ctx) {
    let res, rows;
    if (ctx.options[0] == "all") {
        res = await ctx.client.pg.query("SELECT * FROM usage;");
        res.rows.reduce((acc, row) => {
            for (let name of Object.keys(row)) {
                if (name != "guild") {
                    acc[name] = parseInt(acc[name]) + parseInt(row[name]);
                }
            }
        });
        rows = res.rows[0];
        delete rows.guild;
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
