class SubcommandProcessor {
    constructor(name) {
        this.name = name;
    }

    get category() {
        if (!this.subcommands) return;

        return (Object.values(this.subcommands)[0].category);
    }

    async exec(message, ctx) {
        if (!this.subcommands) {
            return ctx.failure(ctx.strings.get("template_sub_no_sub_commands"))
        }

        if (!ctx.options.length) {
            return ctx.send(ctx.strings.get(
                "template_sub_commands_list",
                Object.keys(this.subcommands).map((name) => `\`${name}\``).join(" "))
            );
        }

        let subcommand = ctx.options[0];

        if (Object.keys(this.subcommands).includes(subcommand)) {
            subcommand = this.subcommands[subcommand];
            ctx.path ? ctx.path.push(this.name) : ctx.path = [this.name];

            if (subcommand.checks) {
                let check = await subcommand.checks(message.member, ctx);
                if (!check) {
                    try {
                        await ctx.failure(ctx.strings.get("bot_no_permission"));
                    } catch (error) {
                        ctx.client.emit("error", new CommandOutput("Error sending no permission message", message), error);
                    }

                    return;
                }
            }

            let result = await subcommand.exec(message, ctx);
            if (subcommand.category == "settings") delete ctx.client.guildCache[message.channel.guild.id];

            ctx.client.emit("command", `${ctx.path.join("/")}/${subcommand.name}`, {
                message,
                channel: message.channel.id,
                guild: message.channel.guild.id,
                member: message.author.id,
                timestamp: Date.now()
            }, result);
        } else {
            return ctx.send(ctx.strings.get(
                "template_sub_commands_list",
                Object.keys(this.subcommands).map((name) => `\`${name}\``).join(" "))
            );
        }
    }
}

module.exports = SubcommandProcessor;
