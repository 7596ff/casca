async function exec(message, ctx) {
    let events = Object.keys(ctx.client.events)
        .map((key) => { return {key, count: ctx.client.events[key] }})
        .sort((a, b) => b.count - a.count)
        .map((key) => `\`${key.key.toUpperCase()}\`:  ${key.count}`)
        .join("\n");
    
    return ctx.send(events);
}

module.exports = {
    name: "events",
    category: "owner",
    exec
};
