async function embed(client) {
    let shardInfo = [`\`\`\`groovy\nShards: ${client.shards.size}`];
    let users = new Array(client.shards.size).fill(new Map());
    let guilds = new Array(client.shards.size).fill(0);

    client.guilds.forEach((guild) => {
        guild.members.map((member) => users[guild.shard.id].set(member.id, member.id));
        guilds[guild.shard.id] += 1;
    });

    client.shards.forEach((shard) => {
        shardInfo.push(`Shard ${shard.id}: ${guilds[shard.id]} guilds, ${users[shard.id].size} users, ${shard.latency} ms`);
    });

    shardInfo.push("```");

    return {
        description: shardInfo.join("\n")
    };
}

async function exec(message, ctx) {
    let result = await embed(ctx.client.bot);

    return ctx.send({
        content: `I am shard ${message.channel.guild.shard.id + 1} of ${ctx.client.bot.shards.size}.`,
        embed: result
    });
}

module.exports = {
    name: "shardinfo",
    category: "owner",
    embed,
    exec
};
