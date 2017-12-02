async function exec(message, ctx) {
    return ctx.send("pong 2");
}

module.exports = {
    name: "ping",
    category: "utility",
    exec
};
