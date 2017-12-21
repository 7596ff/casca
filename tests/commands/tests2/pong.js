async function exec(message, ctx) {
    return ctx.send("Pong");
}

async function checks(member, ctx) {
    return true;
}

module.exports = {
    name: "pong",
    category: "utility",
    checks,
    exec
};
