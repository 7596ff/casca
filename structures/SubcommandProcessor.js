class SubcommandProcessor {
    constructor(name) {
        this.name = name;
    }

    exec(message, ctx) {
        if (!this.subcommands) {
            return ctx.failure(ctx.strings.get("template_sub_no_sub_commands"))
        }

        if (!ctx.options.length) {
            return ctx.send(ctx.strings.get(
                "template_sub_commands_list",
                Object.keys(this.subcommands).map((name) => `\`${name}\``).join(" "))
            );
        }

        if (Object.keys(this.subcommands).includes(ctx.options[0])) {
            return this.subcommands[ctx.options[0]].exec(message, ctx);
        }
    }
}

module.exports = SubcommandProcessor;
