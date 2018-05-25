const pad = require("pad");

function bold(arg1, arg2) {
    return `**${arg1}:** ${arg2}`;
}

async function exec(message, ctx) {
    if (ctx.content.length) {
        let commands = Object.values(ctx.client.commands);
        let names = {};
        
        for (let command of commands) {
            names[command.name] = command.name
        }

        for (let command of commands.filter((command) => command.aliases)) {
            for (let alias of command.aliases) {
                names[alias] = command.name;
            }
        }

        if (!Object.keys(names).includes(ctx.content)) {
            return ctx.send(ctx.strings.get("help_cant_find", ctx.content));
        }

        let name = names[ctx.content];

        let msg = [];
        let command = ctx.client.commands[name];
        let search = `help_command_${name}_`;

        if (command.generated) {
            msg.push(
                bold(ctx.strings.get("help_usage"), `\`${ctx.row.prefix || ctx.client.options.prefix}${command.name} <${command.type}>\``),
                "",
                ctx.strings.has(search + "description")
                    ? ctx.strings.get(search + "description")
                    : ctx.strings.get("help_cmd_template_desc", command.name, command.type)
            );
    
            return ctx.send(msg.join("\n"));
        }

        if (ctx.strings.has(search + "usage")) {
            msg.push("", bold(ctx.strings.get("help_usage"), `\`${ctx.strings.get(search + "usage", ctx.row.prefix || ctx.client.options.prefix)}\``));
        } else {
            msg.push("", bold(ctx.strings.get("help_usage"), `\`${ctx.row.prefix || ctx.client.options.prefix}${name}\``))
        }

        if (command.aliases) {
            msg.push("", bold(ctx.strings.get("help_aliases"), command.aliases.join(", ")));
        }

        if (ctx.strings.has(search + "description")) {
            msg.push("", ctx.strings.get(search + "description"));
        }

        if (ctx.strings.has(search + "args0")) {
            msg.push("", ...ctx.strings.all(search + "args", "array"));
        }

        if (Math.floor(Math.random() * 5) == 0) {
            msg.push("", ctx.strings.get("help_footer"));
        }

        if (msg[0] === "") msg.splice(0, 1);

        return ctx.send(msg.join("\n"));
    } else {
        let categories = Object.values(ctx.client.commands)
            .map((command) => command.category)
            .filter((item, index, array) => item && array.indexOf(item) === index)
            .sort();

        let mapping = {};
        for (category of categories) {
            mapping[category] = [];
        }

        for (let command of (Object.values(ctx.client.commands))) {
            if (!command.category) continue;

            if (command.checks) {
                let res = await command.checks(message.member, ctx);
                if (!res) continue;
            }

            mapping[command.category].push(command.name);
        }

        let padding = Object.keys(mapping)
            .sort((a, b) => b.length - a.length)[0].length;

        let msg = Object.keys(mapping)
            .map((key) => `${pad(padding, key.toUpperCase())}: ${mapping[key].join(", ")}`);

        msg[msg.length - 1] += "```";

        msg.unshift(ctx.strings.get("help_list_of_commands") + " ```");
        msg.push(ctx.strings.get("help_instruction", ctx.row.prefix || ctx.client.options.prefix), ctx.strings.get("help_footer"));

        ctx.send(msg.join("\n "));
    }
}

module.exports = {
    name: "help",
    category: "meta",
    exec
};
