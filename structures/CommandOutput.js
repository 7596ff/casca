// why am i not using typescript

class CommandOutput {
    constructor(text, ctx) {
        this.text = text;
        this.ctx = ctx;
        this.channel = ctx.message.channel;
        this.guild = ctx.message.channel.guild;
        this.user = ctx.message.author;
        this.timestamp = Date.now();
    }
}

module.exports = CommandOutput;
