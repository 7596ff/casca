async function exec(message, ctx) {
    return ctx.send(ctx.strings.get("pong", message.channel.guild.shard.latency));
}

module.exports = {
    name: "pong",
    category: "utility",
    exec
};
