const pad = require("pad");

function bold(arg1, arg2) {
    return `**${arg1}:** ${arg2}`;
}

async function formatHelp(ctx, command) {
    let rows = [];
    let searchString = `help_cmd_${command.name}_`;

    rows.push(bold(ctx.strings.get("help_name"), command.name));

    if (command.generated) {
        rows.push(
            bold(ctx.strings.get("help_usage"), `\`${ctx.row.prefix || ctx.client.options.prefix}${command.name} <${command.type}>\``),
            "",
            ctx.strings.get("help_cmd_template_desc", command.name, command.type)
        );

        return ctx.send(rows.join("\n"));
    }

    let usage = ctx.strings.get(searchString + "usage", ctx.row.prefix || ctx.client.options.prefix);
    if (usage && usage !== searchString + "usage") {
        rows.push(bold(ctx.strings.get("help_usage"), `\`${usage}\``));
    }

    let desc = ctx.strings.get(searchString + "desc");
    if (desc && desc !== searchString + "desc") {
        rows.push("", desc);
    }

    if (command.aliases) {
        rows.push("", bold(ctx.strings.get("help_aliases"), command.aliases.map((a) => `\`${a}\``).join(", ")));
    }

    let args = ctx.strings.all(searchString + "args", "array");
    if (args.length) {
        rows.push("", `**${ctx.strings.get("help_args")}:**`, ...args);
    }

    if (Math.floor(Math.random() * 5) == 0) rows.push("", ctx.strings.get("help_footer"));

    return ctx.send(rows.join("\n"));
}

async function exec(message, ctx) {
    let cmds = {};
    let aliases = {};
    let disabled = [];

    for (let command in ctx.client.commands) {
        command = ctx.client.commands[command];

        if (command.checks) {
            let res = await command.checks(message.member, ctx);
            if (!res) continue;
        }

        if (ctx.row.disabled && ctx.row.disabled[message.channel.id] && ctx.row.disabled[message.channel.id].includes(command.name)) {
            disabled.push(command.name);
            if (command.aliases) disabled.push(...command.aliases);
            continue;
        }

        if (command.category) {
            if (!cmds[command.category]) cmds[command.category] = [];
            cmds[command.category].push(command.name);
        } else {
            if (!cmds.uncategorized) cmds.uncategorized = [];
            cmds.uncategorized.push(command.name);
        }

        if (command.aliases) {
            command.aliases.forEach((alias) => {
                aliases[alias] = command.name;
            });
        }

        aliases[command.name] = command.name;
    }

    if (aliases.hasOwnProperty(ctx.options[0])) {
        let command = ctx.client.commands[aliases[ctx.options[0]]];
        return formatHelp(ctx, command);
    } else if (ctx.options.length === 0) {
        let longest = 0;
        for (let group in cmds) {
            group = cmds[group];
            longest = longest < group.length ? group.length : longest;
        }

        let padlength = Object.values(aliases).sort((a, b) => b.length - a.length)[0].length;

        let rows = Object.keys(cmds).map((item) => pad(padlength, item.toUpperCase()) + ":");
        rows = rows.map((row, index) => `${row} ${Object.values(cmds)[index].join(", ")}`)

        let grid = rows.join("\n");

        let msg = [
            ctx.strings.get("help_list_of_commands") + "```",
            grid,
            "```",
            ctx.strings.get("help_instruction", ctx.row.prefix || ctx.client.options.prefix),
            ctx.strings.get("help_footer")
        ].join("\n");

        return ctx.send(msg);
    } else if (disabled.includes(ctx.options[0])) {
        if (ctx.row.botspam > 0) {
            return ctx.failure(ctx.strings.get("bot_botspam_redirect", ctx.row.botspam));
        } else {
            return ctx.failure(ctx.strings.get("bot_botspam"));
        }
    } else {
        return ctx.failure(ctx.strings.get("help_cant_find", ctx.options.join(" ")));
    }
}

module.exports = {
    name: "help",
    category: "meta",
    exec
};
