class Context {
    constructor(message) {
        this.message = message;
    }

    get options() {
        return this.message.content.split(" ").slice(1);
    }

    async send() {
        return this.message.channel.createMessage(...arguments);
    }

    async embed(embed) {
        return this.message.channel.createMessage({ embed });
    }

    async success(str) {
        return this.message.channel.createMessage(`✅ ${str}`);
    }

    async failure(str) {
        return this.message.channel.createMessage(`❌ ${str}`);
    }

    async delete() {
        let args = Array.from(arguments);
        return this.message.channel.createMessage(...args.slice(1)).then((msg) => {
            setTimeout(() => {
                msg.delete().catch((err) => {});
            }, args[0]);
        });
    }
}

module.exports = Context;
