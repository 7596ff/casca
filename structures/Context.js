const FuzzySet = require("fuzzyset.js");

function decideMatch(nick, user) {
    if (!nick) return false;
    if (!user) return true;

    return nick[0][0] > user[0][0];
}

class Context {
    constructor(message) {
        this.message = message;
    }

    get options() {
        return this.message.content.split(" ").slice(1);
    }

    get tokenized() {
        let newString = [""];
        let content = this.message.content.split("");
        let insideString = false;

        while (!!content.length) {
            let character = content.shift();

            if (character == "\"") {
                insideString = !insideString;
                continue;
            }

            if (character == " ") {
                if (insideString) {
                    newString[newString.length - 1] = newString[(newString.length - 1)] +  " ";
                } else {
                    newString.push("");
                }
            } else {
                newString[newString.length - 1] = newString[(newString.length - 1)] + character;
            }
        }

        return newString;
    }

    get content() {
        return this.message.content.split(" ").slice(1).join(" ");
    }

    findMember(name) {
        let id;
        if (this.message.channel.guild.members.get(id = name.replace(/\D/g, ""))) {
            return id;
        }

        let usernames = FuzzySet(this.message.channel.guild.members.map((member) => member.username));
        let nicknames = FuzzySet(this.message.channel.guild.members.filter((member) => member.nick).map((member) => member.nick));

        let threshold = 0.8;

        if (this.message.channel.guild.members.size < 5000) {
            threshold = this.message.channel.guild.members.size / 5000 * 0.3 + 0.5;
        }

        let matchedUsername = usernames.get(name);
        let matchedNickname = nicknames.get(name);

        let nickOrUser = decideMatch(matchedNickname, matchedUsername);
        let matched = nickOrUser ? matchedNickname : matchedUsername;

        if (matched && matched[0][0] >= threshold && matched[0][1]) {
            let member = this.message.channel.guild.members.find((member) => {
                if (nickOrUser) {
                    return member.nick == matched[0][1];
                } else {
                    return member.username == matched[0][1];
                }
            });

            return member.id;
        }

        return false;
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

    async code(lang, str, file) {
        return this.message.channel.createMessage(`\`\`\`${lang}\n${str}\n\`\`\``, file);
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
