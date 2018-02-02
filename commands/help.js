const pad = require("pad");

function bold(arg1, arg2) {
    return `**${arg1}:** ${arg2}`;
}

async function exec(message, ctx) {
    if (ctx.content.length) {

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
