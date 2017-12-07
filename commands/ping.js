async function exec(message, ctx) {
    let msg = await ctx.send(message.timestamp);
    return msg.edit(ctx.strings.get("ping", msg.timestamp - message.timestamp));
}

module.exports = {
    name: "ping",
    aliases: ["pang"],
    category: "utility",
    exec
};
