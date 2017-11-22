const Eris = require ("eris");
const EventEmitter = require("eventemitter3");
const Postgres = require("pg");

class Client extends EventEmitter {
    constructor(options) {
        super();

        this.options = options;

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

    guildCreate(gulid) {

    }

    guildUpdate(guild, oldGuild) {

    }

    guildDelete(guild) {

    }

    messageCreate(message) {
        
    }

    error(error, id) {
        this.emit("error", error, id);
    }
}

module.exports = Client;
