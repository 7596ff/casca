const fs = require("fs");
const Eris = require ("eris");
const EventEmitter = require("eventemitter3");
const Postgres = require("pg");

const readdirAsync = require("util").promisify(fs.readdir);

var names = fs.readdirSync("../commands");
const commands = {};
for (let name of names) {
    commands[name.split(".")[0]] = require(`../commands/${name}`);
}

class Client extends EventEmitter {
    constructor(options) {
        super();

        this.options = options;
        this.commands = {};

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
        this.emit("bot", `LEFT GUILD:  ${guild.id}/${guild.name}`);
        this.pg.query({
            text: "DELETE FROM guilds WHERE id = $1",
            values: [guild.id]
        }).catch((error) => {
            this.emit("error", `Couldn't delete guild ${guild.id}/${guild.name}`, error);
        });
    }

    messageCreate(message) {

    }

    error(error, id) {
        this.emit("error", `Error on shard ${id}`, error);
    }
}

module.exports = Client;
