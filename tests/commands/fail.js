async function exec(message, ctx) {
    throw "error"
}

module.exports = {
    name: "fail",
    category: "utility",
    aliases: ["meirl"],
    exec
};
