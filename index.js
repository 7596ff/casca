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
        this.bot.on("ready", this.ready);
        this.bot.on("guildCreate", this.guildCreate);
        this.bot.on("guildUpdate", this.guildUpdate);
        this.bot.on("guildDelete", this.guildDelete);
        this.bot.on("messageCreate", this.messageCreate);
        this.bot.on("error", this.error);
    }

    async connect() {
        await this.pg.connect();

        
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
