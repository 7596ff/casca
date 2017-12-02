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
    let channel = disabled[message.channel.id] || [];

    for (let name of ctx.options) {
        if (allowed.includes(name)) channel.push(name);
    }

    disabled[message.channel.id] = channel.filter((item, index, array) => array.indexOf(item) === index);
    
    try {
        await ctx.client.pg.query({
            text: "UPDATE public.guilds SET disabled = $1 WHERE id = $2;",
            values: [disabled, message.channel.guild.id]
        });
    } catch (error) {
        await ctx.failure(ctx.strings.get("bot_generic_error"));
        throw error;
    }

    if (disabled[message.channel.id].length) {
        return ctx.success(ctx.strings.get(
            "commands_disable_list",
            disabled[message.channel.id].map((item) => `\`${item}\``).join(" ")
        ));
    } else {
        return ctx.success(ctx.strings.get("commands_disable_none"));
    }
}

async function checks(member, ctx) {
    if (!this.permission) return true;
    return member.permission.has(this.permission);
}

module.exports = {
    name: "disable",
    category: "settings",
    immune: true,
    checks,
    exec
};
