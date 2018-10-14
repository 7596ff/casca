const util = require("util");

async function exec(message, ctx) {
    try {
        let evaled = eval(ctx.content);
        if (evaled && evaled.then) evaled = await evaled;
        if (typeof evaled !== "string") evaled = util.inspect(evaled);

        ctx.send(`${"```js\n"}${evaled}${"\n```"}`).catch((err) => {
            console.log(evaled);
            return ctx.send("Result too long for one message.");
        });
    } catch (error) {
        ctx.send(`${"`ERROR`\n```js\n"}${error}${"\n```"}`).catch((err) => {
            console.error(error);
            return ctx.send("Error too long for one message.");
        });
    }
}

async function checks(member, ctx) {
    return member.id == ctx.client.options.owner;
}

module.exports = {
    name: "eval",
    category: "owner",
    immune: true,
    checks,
    exec
};
