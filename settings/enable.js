async function exec(message, ctx) {
    let allowed = Object.values(ctx.client.commands)
        .filter((command) => !command.immune)
        .map((command) => command.name);

    let res;
    try {
        res = await ctx.client.pg.query({
            text: "SELECT disabled FROM guilds WHERE id = $1;",
            values: [message.channel.guild.id]
        });
    } catch (error) {
        await ctx.failure(ctx.strings.get("bot_generic_error"));
        throw error;
    }

    let disabled = res.rows[0].disabled;
    let channel = disabled[message.channel.id];

    if (!channel || !channel.length) {
        return ctx.failure(ctx.strings.get("commands_enable_error"));
    }

    for (let name of ctx.options) {
        if (channel.includes(name)) channel.splice(channel.indexOf(name), 1);
    }

    try {
        await ctx.client.pg.query({
            text: "UPDATE public.guilds SET disabled = $1 WHERE id = $2;",
            values: [disabled, message.channel.guild.id]
        });
    } catch (error) {
        await ctx.failure(ctx.strings.get("bot_generic_error"));
        throw error;
    }

    if (channel.length) {
        return ctx.success(ctx.strings.get(
            "commands_disable_list",
            channel.map((item) => `\`${item}\``).join(" ")
        ));
    } else {
        return ctx.success(ctx.strings.get("commands_disable_none"));
    }
}

module.exports = {
    name: "enable",
    category: "settings",
    immune: true,
    exec
};
