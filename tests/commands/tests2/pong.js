async function exec(message, ctx) {
    return ctx.send("pong 2");
}

module.exports = {
    name: "pong",
    category: "utility",
    exec
};
