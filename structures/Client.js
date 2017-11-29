const fs = require("fs");
const Eris = require ("eris");
const EventEmitter = require("eventemitter3");
const Postgres = require("pg");
const prettyms = require("pretty-ms");

const Context = require("./Context");
const Strings = require("./Strings");

const readdirAsync = require("util").promisify(fs.readdir);

var commandNames = fs.readdirSync("../commands");
const commands = {};
for (let name of commandNames) {
    commands[name.split(".")[0]] = require(`../commands/${name}`);
}

var localeNames = fs.readdirSync("../locales");
const locales = {};
for (let name of localeNames) {
    locales[name.split(".")[0]] = require(`../locales/${name}`);
}

class Client extends EventEmitter {
    constructor(options) {
        super();

        this.options = Object.assign({
            prefix: "!",
            defaultLocale: "en",
            allowCommandDisabling: false,
            guildPrefix: false,
            botspamChannel: false,
            sendCooldownMessages: false,
        }, options);

        this.commands = {};
        this.locales = {};
        this.guildCache = {};
        this.cooldowns = {};
        this.isReady = false;

        this.pg = new Postgres.Client(options.postgres);
        this.pg.on("error", (error) => {
            this.emit("error", error);
        });

        this.bot = new Eris(options.token, options.eris);
        this.bot.on("ready", () => this.ready());
        this.bot.on("guildCreate", (guild) => this.guildCreate(guild));
        this.bot.on("guildUpdate", (guild, oldGuild) => this.guildUpdate(guild, oldGuild));
        this.bot.on("guildDelete", (guild) => this.guildDelete(guild));
        this.bot.on("messageCreate", (message) => this.messageCreate(message));
        this.bot.on("error", (error, id) => this.error(error, id));
    }

    async load() {
        this.emit("info", "Loading default commands...");
        
        if (this.options.blacklist) {
            this.emit("info", `Blacklist detected. Skipping commands (${this.options.blacklist.join(", ")})`);
            for (let name of Object.keys(commands)) {
                if (!~this.options.blacklist.indexOf(name)) this.commands[name] = commands[name];
            }
        } else if (this.options.whitelist) {
            this.emit("info", `Whitelist detected. Only adding commands (${this.options.whitelist.join(", ")})`);
            for (let name of Object.keys(commands)) {
                if (!!~this.options.whitelist.indexOf(name)) this.commands[name] = commands[name];
            }
        } else {
            this.emit("info", "No blacklist or whitelist detected, loading all default commands.");
            for (let name of Object.keys(commands)) {
                this.commands[name] = commands[name];
            }
        }

        this.emit("info", "Loading custom commands...");
        let names = await readdirAsync(this.options.commands);
        for (let name of names) {
            if (this.commands[name]) this.emit("info", `Overwriting default command for ${name}.`);
            this.commands[name] = require(`${this.options.commands}${name}`);
        }

        this.emit("info", `${Object.keys(this.commands).length} command(s) loaded.`);
    }

    connect() {
        this.emit("info", "Connecting to postgres...");
        this.pg.connect().then(() => {
            this.emit("info", "Connecting to discord...");
            this.bot.connect();
        });
    }

    ready() {
        this.isReady = true;
        this.emit("ready");
    }

    guildCreate(guild) {
        this.emit("bot", `JOINED GUILD: ${guild.id}/${guild.name}`);
        this.pg.query({
            text: "INSERT INTO guilds (id, name) VALUES ($1, $2)",
            values: [guild.id, guild.name.slice(0, 20)]
        }).catch((error) => {
            this.emit("error", `Couldn't insert guild ${guild.id}/${guild.name}`, error);
        });
    }

    guildUpdate(guild, oldGuild) {
        if (guild.name !== oldGuild.name) {
            this.pg.query({
                text: "UPDATE guilds SET name = $1 WHERE id = $2",
                values: [guild.name.slice(0, 20), guild.id]
            }).catch((error) => {
                this.emit("error", `Couldn't update guild ${guild.id}/${guild.name}`, error);
            });
        }
    }

    guildDelete(guild) {
        this.emit("bot", `LEFT GUILD: ${guild.id}/${guild.name}`);
        this.pg.query({
            text: "DELETE FROM guilds WHERE id = $1",
            values: [guild.id]
        }).catch((error) => {
            this.emit("error", `Couldn't delete guild ${guild.id}/${guild.name}`, error);
        });
    }

    async getGuild(id) {
        if (this.guildCache[id] && this.guildCache[id].expires + 60000 > Date.now()) {
            return Object.assign({}, this.guildCache[id]);
        } else {
            let res = await this.pg.query({
                text: "SELECT * FROM guilds WHERE id = $1;",
                values: [id]
            });

            this.guildCache[id] = Object.assign({}, res.rows[0]);
            this.guildCache[id].expires = Date.now();
            return Object.assign({}, this.guildCache[id]);
        }
    }

    checkDisabled(row, channel, command) {
        if (!this.allowCommandDisabling) return false;
        if (!row.disabled) return false;
        if (!row.disabled[channel]) return false;
        if (!row.disabled[channel].includes(command)) return false;

        return true;
    }

    async messageCreate(message) {
        if (!this.isReady) return;
        if (!message.channel.guild) return;
        if (!message.author) return;
        if (message.member && message.member.bot) return;
        if (message.author && message.author.id == this.bot.user.id) return;

        let row = await this.getGuild(message.channel.guild.id);

        let isCommand = false;

        if (message.content.startsWith(this.options.prefix)) {
            isCommand = true;
            message.content = message.content.replace(this.options.prefix, "");
        } else if (message.content.startsWith(row.prefix)) {
            isCommand = true;
            message.content = message.content.replace(row.prefix, "");
        }

        if (!isCommand) return;

        let command = message.content.split(" ").shift().toLowerCase();

        for (let cmd in this.commands) {
            if (cmd.aliases && cmd.aliases.includes(command)) command = cmd.name;
        }

        command = this.commands[command];
        if (!command) return;

        let ctx = new Context(message);
        ctx.strings = new Strings(
            this.locales[row.locale] || {},
            this.locales[this.options.defaultLocale] || {},
            locales[row.locale] || {},
            locales[this.options.defaultLocale] || {}
        );

        let shouldExecute = false;
        if (command.ignoreCooldowns) shouldExecute = true;
        if (row.botspam == message.channel.id) shouldExecute = true;

        if (this.checkDisabled(row, message.channel.id, command.name) && !shouldExecute) {
            let msg;
            if (row.botspam) {
                msg = ctx.strings.get("bot_botspam_redirect", row.botspam);
            } else {
                msg = ctx.strings.get("bot_botspam");
            }

            try {
                await ctx.failure(msg);
            } catch (error) {
                this.emit("error", {
                    text: "Error sending botspam redirect message",
                    channel: message.channel.id,
                    guild: message.channel.guild.id,
                    member: message.author.id,
                    timestamp: Date.now()
                }, error);
            }

            return;
        }

        let channelCD = `channelCD:${message.channel.id}`;
        let memberCD = `memberCD:${message.channel.guild.id}:${message.author.id}`;

        if (row.channelCD && (this.cooldowns[channelCD] || 0) + (row.channelCD * 1000) > message.timestamp && !shouldExecute) {
            let msg = ctx.strings.get(
                "bot_cooldown_redirect",
                message.channel.mention,
                prettyms((row.channelCD * 1000) - (message.timestamp - this.cooldowns[channelCD]))
            );

            try {
                await ctx.delete(8000, msg);
            } catch (error) {
                this.emit("error", {
                    text: "Error sending channel cooldown redirect message",
                    channel: message.channel.id,
                    guild: message.channel.guild.id,
                    member: message.author.id,
                    timestamp: Date.now()
                }, error);
            }

            return;
        }

        if (row.memberCD && (this.cooldowns[memberCD] || 0) + (row.memberCD * 1000) > message.timestamp && !shouldExecute) {
            let msg = ctx.strings.get(
                "bot_cooldown_redirect",
                message.channel.mention,
                prettyms((row.channelCD * 1000) - (message.timestamp - this.cooldowns[channelCD]))
            );

            try {
                await ctx.delete(8000, msg);
            } catch (error) {
                this.emit("error", {
                    text: "Error sending channel cooldown redirect message",
                    channel: message.channel.id,
                    guild: message.channel.guild.id,
                    member: message.author.id,
                    timestamp: Date.now()
                }, error);
            }

            return;
        }

        try {
            if (command.typing) await message.channel.sendTyping();
            let output = await command.exec(message, ctx);

            this.emit("command", command.name, {
                message,
                channel: message.channel.id,
                guild: message.channel.guild.id,
                member: message.author.id,
                timestamp: Date.now()
            }, output);
        } catch (error) {
            this.emit("error", {
                text: `Error executing command ${command.name}`,
                channel: message.channel.id,
                guild: message.channel.guild.id,
                member: message.author.id,
                timestamp: Date.now()
            }, error);
        }
    }

    error(error, id) {
        this.emit("error", `Error on shard ${id}`, error);
    }
}

module.exports = Client;
