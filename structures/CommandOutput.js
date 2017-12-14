// why am i not using typescript

class CommandOutput {
    constructor(text, message) {
        this.text = text;
        this.content = message.content;
        this.channel = message.channel;
        this.guild = message.channel.guild;
        this.user = message.author;
        this.timestamp = Date.now();
    }
}

module.exports = CommandOutput;
