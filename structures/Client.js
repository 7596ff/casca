const fs = require("fs");
const Eris = require ("eris");
const EventEmitter = require("eventemitter3");
const Postgres = require("pg");
const prettyms = require("pretty-ms");
const CronJob = require("cron").CronJob;

const Context = require("./Context");
const Strings = require("./Strings");
const CommandOutput = require("./CommandOutput");
const CommandTemplate = require("./CommandTemplate");
const SubcommandProcessor = require("./SubcommandProcessor");

const readdirAsync = require("util").promisify(fs.readdir);

const commands = {};
commands.botstats = require("../commands/botstats");
commands.eval = require("../commands/eval");
commands.events = require("../commands/events");
commands.help = require("../commands/help");
commands.invite = require("../commands/invite");
commands.ping = require("../commands/ping");
commands.pong = require("../commands/pong");
commands.shardinfo = require("../commands/shardinfo");
commands.usage = require("../commands/usage");

const locales = {};
locales.en = require("../locales/en.json");

const help = {};
help.en = require("../help/en.json");

const settings = {};
settings.cooldowns = require("../settings/cooldowns");
settings.disable = require("../settings/disable");
settings.enable = require("../settings/enable");
settings.prefix = require("../settings/prefix");

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
            sendErrorMessages: false,
        }, options);

        this.commands = {};
        this.locales = {};
        this.guildCache = {};
        this.cooldowns = {};
        this.events = {};
        this.isReady = false;

        if (options.status) {
            if (Array.isArray(options.status)) {
                let cron = "0 */30 * * * *";
                this.statuses = options.status;

                try {
                    new CronJob(options.statusCron, () => console.log("a"));
                    cron = options.statusCron;
                } catch (err) {
                    console.error(`Invalid Cron pattern: ${options.statusCron}`);
                }

                this.statusJob = new CronJob(cron, () => {
                    let status = this.statuses[Math.floor(Math.random() * this.statuses.length)];

                    if (typeof(status) === "string") {
                        status = {
                            name: status,
                            type: 0
                        };
                    }

                    this.bot.editStatus("online", status);
                }, null, false);
            } else {
                this.status = options.status;
            }
        }

        this.pg = new Postgres.Client(options.postgres);
        this.pg.on("error", (error) => {
            this.emit("error", "postgres", error);
        });

        this.bot = new Eris(options.token, options.eris);
        this.bot.on("ready", () => this.ready());
        this.bot.on("rawWS", (packet, id) => this.rawWS(packet, id));
        this.bot.on("guildCreate", (guild) => this.guildCreate(guild));
        this.bot.on("guildUpdate", (guild, oldGuild) => this.guildUpdate(guild, oldGuild));
        this.bot.on("guildDelete", (guild) => this.guildDelete(guild));
        this.bot.on("messageCreate", (message) => this.messageCreate(message));
        this.bot.on("error", (error, id) => this.error(error, id));
    }

    async loadCustomCommands(dir, commands) {
        let names = await readdirAsync(dir);

        for (let filename of names) {
            if (filename.split(".").length == 1) {
                commands[filename] = new SubcommandProcessor(filename);
                await this.loadCustomCommands(`${dir}/${filename}`, commands[filename].subcommands = {});
                if (commands[filename].subcommands._default) commands[filename].default = commands[filename].subcommands._default;
            } else {
                let name = filename.split(".")[0];
                if (commands[name]) this.emit("info", `Overwriting default command for ${name}.`);
                commands[name] = require(`${process.cwd()}/${dir}/${filename}`);
            }
        }
    }

    async loadCustomLocales(dir, locales) {
        let names = await readdirAsync(dir);

        for (let filename of names) {
            let name = filename.split(".")[0];
            locales[name] = require(`${process.cwd()}/${dir}/${filename}`);
        }
    }

    async loadCustomHelp(dir, locales) {
        let names;
        if (dir) {
            names = await readdirAsync(dir);
        } else {
            names = Object.keys(help)
        }

        for (let filename of names) {
            let name = filename.split(".")[0];
            if (!locales[name]) locales[name] = {};

            let customhelp;
            if (dir) {
                customhelp = require(`${process.cwd()}/${dir}/${filename}`);
            } else {
                customhelp = help[name];
            }

            for (let key of Object.keys(customhelp)) {
                let value = customhelp[key];
                
                if (value.usage) locales[name][`help_command_${key}_usage`] = value.usage;
                if (value.description) locales[name][`help_command_${key}_description`] = value.description;

                if (value.args) {
                    let i = 0;
                    for (let arg in value.args) {
                        locales[name][`help_command_${key}_args${i}`] = `\`${arg}\`: ${value.args[arg]}`;
                        i++;
                    }
                }
            }
        }
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

        this.emit("info", "Loading settings commands...");

        if (this.options.allowCommandDisabling) {
            this.commands.enable = settings.enable;
            this.commands.enable.permission = this.options.allowCommandDisabling;

            this.commands.disable = settings.disable;
            this.commands.disable.permission = this.options.allowCommandDisabling;
        }

        if (this.options.guildPrefix) {
            this.commands.prefix = settings.prefix;
            this.commands.prefix.permission = this.options.guildPrefix;
        }

        if (this.options.botspamChannel) {
            this.commands.botspam = new CommandTemplate("botspam", "channel");
            this.commands.botspam.permission = this.options.botspamChannel;
        }

        if (this.options.cooldowns) {
            this.commands.cooldowns = settings.cooldowns;
            this.commands.cooldowns.permission = this.options.cooldowns;
        }

        if (this.options.settings) {
            for (let setting of Object.keys(this.options.settings)) {
                if (this.options.settings[setting].cmd !== false) {
                    this.commands[setting] = new CommandTemplate(setting, this.options.settings[setting]);
                }
            }
        }

        if (this.options.commands) {
            this.emit("info", "Loading custom commands...");
            await this.loadCustomCommands(this.options.commands, this.commands);
        }

        if (this.options.locales) {
            this.emit("info", "Loading custom locales...");
            await this.loadCustomLocales(this.options.locales, this.locales);
        }

        this.emit("info", "Loading help locale...");
        await this.loadCustomHelp(null, this.locales);

        if (this.options.help) {
            this.emit("info", "Loading custom help locale...");
            await this.loadCustomHelp(this.options.help, this.locales);
        }

        this.emit("info", `${Object.keys(this.commands).length} command(s) loaded.`);
    }

    connect() {
        this.emit("info", "Connecting to postgres...");
        this.pg.connect().then(() => {
            this.emit("info", "Altering usage table...");
            let query = "ALTER TABLE usage ";
            let columns = [];
            for (let command of Object.values(this.commands)) {
                columns.push(`ADD COLUMN IF NOT EXISTS ${command.name} BIGINT DEFAULT 0`);
            }
            query += columns.join(", ");
            query += ";";

            this.pg.query(query).then(() => {
                this.emit("info", "Connecting to discord...");
                this.bot.connect();
            });
        });
    }

    ready() {
        this.isReady = true;
        this.emit("ready");
        this.syncGuilds();

        if (typeof(this.status) === "string") {
            this.bot.editStatus("online", {
                name: this.status,
                type: 0
            });
        } else if (typeof(this.status) === "object") {
            this.bot.editStatus("online", this.status);
        } else if (this.statusJob) {
            this.statusJob.start();
        }
    }

    rawWS(packet, id) {
        if (packet.t == null) return;

        if (!this.events[packet.t]) {
            this.events[packet.t] = 1;
        } else {
            this.events[packet.t] += 1;
        }
    }

    async syncGuilds() {
        try {
            let res = await this.pg.query("SELECT id FROM guilds;");

            let pgGuilds = res.rows.map((row) => row.id);
            let discordGuilds = this.bot.guilds.map((guild) => guild.id);

            let differences = discordGuilds.filter((guild) => !pgGuilds.includes(guild));

            if (!differences.length) return;

            console.log(`${differences.length} new guild(s) found, inserting...`);

            for (let id of differences) {
                await this.pg.query({
                    text: "INSERT INTO guilds (id, name) VALUES ($1, $2)",
                    values: [id, this.bot.guilds.get(id).name]
                });
            }

            console.log("Done.");
        } catch (error) {
            console.error(error);
            console.error("Error syncing guilds");
        }
    }

    guildCreate(guild) {
        this.emit("bot", `JOINED GUILD: ${guild.id}/${guild.name}`);
        this.pg.query({
            text: "INSERT INTO guilds (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
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

        for (let cmd of Object.values(this.commands)) {
            if (cmd.aliases && cmd.aliases.includes(command)) command = cmd.name;
        }

        command = this.commands[command];
        if (!command) return;

        let ctx = new Context(message);
        ctx.client = this;
        ctx.row = row;
        ctx.strings = new Strings(
            this.locales[row.locale] || {},
            this.locales[this.options.defaultLocale] || {},
            locales[row.locale] || {},
            locales[this.options.defaultLocale] || {}
        );

        let shouldExecute = false;
        if (command.immune) shouldExecute = true;
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
                this.emit("error", new CommandOutput("Error sending botspam redirect message", ctx), error);
            }

            return;
        }

        let channelCD = `channelCD:${message.channel.id}`;
        let memberCD = `memberCD:${message.channel.guild.id}:${message.author.id}`;

        if (row.channelcd && (this.cooldowns[channelCD] || 0) + (row.channelcd * 1000) > message.timestamp && !shouldExecute) {
            let msg = ctx.strings.get(
                "bot_cooldown_redirect",
                message.channel.mention,
                prettyms((row.channelcd * 1000) - (message.timestamp - this.cooldowns[channelCD]), { verbose: true })
            );

            try {
                if (this.options.sendCooldownMessages) await ctx.delete(8000, msg);
            } catch (error) {
                this.emit("error", new CommandOutput("Error sending channel cooldown redirect message", ctx), error);
            }

            return;
        }

        if (row.membercd && (this.cooldowns[memberCD] || 0) + (row.membercd * 1000) > message.timestamp && !shouldExecute) {
            let msg = ctx.strings.get(
                "bot_cooldown_redirect",
                message.author.mention,
                prettyms((row.membercd * 1000) - (message.timestamp - this.cooldowns[memberCD]), { verbose: true })
            );

            try {
                if (this.options.sendCooldownMessages) await ctx.delete(8000, msg);
            } catch (error) {
                this.emit("error", new CommandOutput("Error sending member cooldown redirect message", ctx), error);
            }

            return;
        }

        if (command.checks) {
            let check = await command.checks(message.member, ctx);
            if (!check) {
                try {
                    await ctx.failure(ctx.strings.get("bot_no_permission"));
                } catch (error) {
                    this.emit("error", new CommandOutput("Error sending no permission message", ctx), error);
                }

                return;
            }
        }

        try {
            if (command.typing) await message.channel.sendTyping();
            let result = await command.exec(message, ctx);

            if (command.category == "settings") delete this.guildCache[message.channel.guild.id];

            this.cooldowns[channelCD] = message.timestamp;
            this.cooldowns[memberCD] = message.timestamp;

            try {
                await this.pg.query([
                    `INSERT INTO usage (guild, ${command.name})`, 
                    `VALUES (${message.channel.guild.id}, 1)`,
                    `ON CONFLICT (guild) DO`,
                    `UPDATE SET ${command.name} = usage.${command.name} + 1 WHERE usage.guild = ${message.channel.guild.id};`
                ].join(" "));
            } catch (error) {
                this.emit("error", "Error updating usage", error);
            }

            if (!command.processor) this.emit("command", new CommandOutput(command.name, ctx), result);
        } catch (error) {
            this.emit("error", new CommandOutput(`Error executing command ${command.name}`, ctx), error);
            if (this.options.sendErrorMessages) {
                try { ctx.failure(ctx.strings.get("bot_generic_error")); } catch (error) {}
            }
        }
    }

    error(error, id) {
        this.emit("error", `Error on shard ${id}`, error);
    }
}

module.exports = Client;
