async function exec(message, ctx) {
    return ctx.send(`<https://discordapp.com/oauth2/authorize?client_id=${ctx.client.bot.user.id}&permissions=${ctx.client.options.permissions}&scope=bot>`);
}

module.exports = {
    name: "invite",
    category: "meta",
    exec
};
