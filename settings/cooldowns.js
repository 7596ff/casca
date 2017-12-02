async function exec(message, ctx) {
    if (!ctx.content) {
      return ctx.failure(ctx.strings.get("bot_bad_syntax"));
    }

    if (!(ctx.options[0] == "channel" || ctx.options[0] == "member")) {
        return ctx.failure(ctx.strings.get("commands_cooldowns_bad_syntax"));
    }

    if (isNaN(ctx.options[1])) {
        return ctx.failure(ctx.strings.get("bot_bad_syntax"));
    }

    try {
        let res;
        if (ctx.options[0] == "channel") {
            res = await ctx.client.pg.query({
                text: "UPDATE guilds SET channelcd = $1 WHERE id = $2;",
                values: [ctx.options[1], message.channel.guild.id]
            });

            message.channel.guild.channels.forEach((channel) => {
                let channelCD = `channelCD:${channel.id}`;
                if (ctx.client.cooldowns[channelCD]) ctx.client.cooldowns[channelCD] = 0;
            });

            return ctx.success(ctx.strings.get("commands_cooldowns_channel_set", ctx.options[1]));
        } else {
            res = await ctx.client.pg.query({
                text: "UPDATE guilds SET membercd = $1 WHERE id = $2;",
                values: [ctx.options[1], message.channel.guild.id]
            });

            message.channel.guild.members.forEach((member) => {
                let memberCD = `memberCD:${message.channel.guild.id}:${member.id}`;
                if (ctx.client.cooldowns[memberCD]) ctx.client.cooldowns[memberCD] = 0;
            });

            return ctx.success(ctx.strings.get("commands_cooldowns_member_set", ctx.options[1]));
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
    name: "cooldowns",
    category: "settings",
    immune: true,
    checks,
    exec
};
