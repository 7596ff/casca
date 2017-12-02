async function exec(message, ctx) {
    try {
        if (!ctx.options.length) {
            await ctx.client.pg.query({
                text: "UPDATE guilds SET prefix = $1 WHERE id = $2;",
                values: ["", message.channel.guild.id]
            });

            return ctx.success(ctx.strings.get("commands_prefix_reset"));
        } else {
            let newPrefix = ctx.content;

            await ctx.client.pg.query({
                text: "UPDATE guilds SET prefix = $1 WHERE id = $2;",
                values: [newPrefix, message.channel.guild.id]
            });

            return ctx.success(ctx.strings.get("commands_prefix_changed", newPrefix));
        }
    } catch (error) {
        await ctx.failure(ctx.strings.get("bot_generic_error"));
        throw error;
    }
}

async function checks(member, ctx) {
    if (!this.permission) return true;
    return member.permission.has(this.permission);
}

module.exports = {
    name: "prefix",
    category: "settings",
    immune: true,
    checks,
    exec
};
