const FuzzySet = require("fuzzyset.js")

const expressions = {
    role: /<@&\d{17,20}>/g,
    channel: /<#\d{17,20}>/g,
    member: /<@!?\d{17,20}>/g
};

class CommandTemplate {
    constructor(name, data) {
        this.name = name;
        this.type = data.type;
        this.permission = data.permission;
        this.category = "settings";
        this.immune = true;
        this.generated = true;
    }

    prettyData(data, message) {
        if (this.type == "role") {
            return message.channel.guild.roles.get(data).name;
        }

        if (this.type == "channel") {
            return `<#${data}>`;
        }

        if (this.type == "member") {
            return message.channel.guild.members.get(data).name;
        }

        return data;
    }

    async checks(member, ctx) {
        if (!this.permission) return true;
        return member.permission.has(this.permission);
    }

    async exec(message, ctx) {
        try {
            if (!ctx.options.length && this.type !== "BOOLEAN") {
                return ctx.failure(ctx.strings.get("commands_template_no_data", this.type));
            }

            let data;

            if (this.type == "role") {
                let match = ctx.content.match(expressions.role);
                if (match) {
                    data = match[0].replace(/\D/g, "");
                } else {
                    let roles = FuzzySet(message.channel.guild.roles.map((role) => role.name));
                    let found = roles.get(ctx.content);

                    if (found && found[0][0] > 0.8 && found[0][1]) {
                        data = message.channel.guild.roles.find((role) => role.name == found[0][1]).id;
                    } else {
                        ctx.failure(ctx.strings.get("commands_template_role_not_found"));
                        data = null;
                    }
                }
            } else if (this.type == "channel") {
                let match = ctx.content.match(expressions.channel);
                if (match) {
                    data = match[0].replace(/\D/g, "");
                } else {
                    let channels = FuzzySet(message.channel.guild.channels.map((channel) => channel.name));
                    let found = channels.get(ctx.content);

                    if (found && found[0][0] > 0.8 && found[0][1]) {
                        data = message.channel.guild.channels.find((channel) => channel.name == found[0][1]).id;
                    } else {
                        ctx.failure(ctx.strings.get("commands_template_channel_not_found"));
                        data = null;
                    }
                }
            } else if (this.type == "member") {
                let match = ctx.content.match(expressions.member);
                if (match) {
                    data = match[0].replace(/\D/g, "");
                } else {
                    let member = ctx.findMember(ctx.content);
                    if (member) {
                        data = member;
                    } else {
                        ctx.failure(ctx.strings.get("commands_template_member_not_found"));
                        data = null;
                    }
                }
            } else if (this.type == "INT") {
                data = parseInt(ctx.content);
                if (isNaN(data)) {
                    return ctx.failure(ctx.strings.get("commands_template_not_an_int"));
                }
            } else if (this.type == "text") { 
                data = ctx.content;
            } else if (this.type == "BOOLEAN") {
                data = !ctx.row[this.name];
            }

            let res = await ctx.client.pg.query({
                text: `UPDATE guilds SET ${this.name} = $1 WHERE id = $2;`, // THIS IS REALLY BAD
                values: [data, message.channel.guild.id]
            });

            if (data === null) return;

            return ctx.success(ctx.strings.get("commands_template_success", this.name, (this.type || "setting").toLowerCase(), this.prettyData(data, message)));
        } catch (error) {
            ctx.failure(ctx.strings.get("bot_generic_error"));
            throw error;
        }
    }
}

module.exports = CommandTemplate;
