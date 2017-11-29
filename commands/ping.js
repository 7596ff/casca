async function exec(message, ctx) {
    return ctx.send("pong");
}

module.exports = {
    name: "ping",
    category: "utility",
    exec
};
