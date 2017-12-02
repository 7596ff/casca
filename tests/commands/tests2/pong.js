async function exec(message, ctx) {
    return ctx.send("pong 2");
}

async function checks(member, ctx) {
    return false;
}

module.exports = {
    name: "pong",
    category: "utility",
    checks,
    exec
};
