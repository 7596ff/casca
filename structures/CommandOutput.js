// why am i not using typescript

class CommandOutput {
    constructor(text, message) {
        this.text = text;
        this.content = message.content;
        this.channel = message.channel.id;
        this.guild = message.channel.guild.id;
        this.user = message.author.id;
        this.timestamp = Date.now();
    }
}

module.exports = CommandOutput;
