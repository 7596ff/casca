const fs = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const Postgres = require("pg");
const mappings = require("./mappings.json");

const defaultColumns = {
    "id": "BIGINT NOT NULL",
    "name": "TEXT",
    "channelCD": "INT DEFAULT 0",
    "memberCD": "INT DEFAULT 0",
    "locale": "TEXT"
};

function isEquivalent(a, b) {
    let aProps = Object.getOwnPropertyNames(a);
    let bProps = Object.getOwnPropertyNames(b);

    if (aProps.length != bProps.length) return false;

    for (let i = 0; i < aProps.length; i++) {
        let propName = aProps[i];
        if (a[propName] != b[propName]) return false;
    }

    return true;
}

async function addColumns(columns, config) {
    for (let key of Object.keys(config.settings)) {
        if (Object.keys(mappings).includes(config.settings[key].type)) {
            config.settings[key].type = mappings[config.settings[key].type];
        }

        if (!columns[key]) {
            columns[key] = config.settings[key].type;
        }
    }

    if (config.defaultLocale) columns.locale = `TEXT DEFAULT '${config.defaultLocale}'`;
    if (config.allowCommandDisabling) columns.disabled = "jsonb DEFAULT '{}'";
    if (config.guildPrefix) columns.prefix = "TEXT";
    if (config.botspamChannel) columns.botspam = "BIGINT";

    return columns;
}

async function migrate(config) {
    var pg = new Postgres.Client(config.postgres)
        .on("error", (error) => {
            console.error(error);
            process.exit(1);
        });

    console.log("Connecting to postgres...");
    await pg.connect();
    console.log("Connected.");

    console.log("Creating an empty usage table if we don't have one already...");
    await pg.query("CREATE TABLE IF NOT EXISTS usage (guild BIGINT NOT NULL, primary key (guild));");

    console.log("Checking if we have a guilds table...");
    let tableResult = await pg.query("SELECT to_regclass('guilds')");
    if (tableResult.rows[0].to_regclass) {
        console.log("Guilds table exists.\nDetermining if we need to migrate the schema...");

        let columns = Object.assign({}, defaultColumns);
        columns = await addColumns(columns, config);

        let migrations;
        try {
            migrations = await readFileAsync("./migrations.json");
            migrations = JSON.parse(migrations);
        } catch (e) {
            console.log("Can not find file migrations.json.");
            process.exit(1);
        }

        let lastSchema = Object.values(migrations).reverse()[0];
        let eq = isEquivalent(columns, lastSchema);

        if (eq) {
            console.log("No migrations necessary.");
            process.exit(0);
        } else {
            console.log("Differences in schema detected. Adding necessary column(s).");

            let oldColumnNames = Object.keys(lastSchema);
            let columnNames = Object.keys(columns);
            let newColumnNames = [];

            for (name of columnNames) {
                if (!oldColumnNames.includes(name)) newColumnNames.push(name);
            }

            if (newColumnNames.length == 0) {
                console.log("No new columns to add.");
            } else {
                console.log(`Found ${newColumnNames.length} new column(s) to add.`);
                console.log("Generating query string...");
    
                let queryString = "ALTER TABLE guilds ";
    
                for (name of newColumnNames) {
                    queryString += `ADD COLUMN ${name} ${columns[name]}`;
                }
    
                queryString += ";";
    
                console.log("Altering table...");
                try {
                    let res = await pg.query(queryString);
                    console.log("Table altered.");
                    console.log(res);
                } catch (e) {
                    console.error("Couldn't apply changes to table:");
                    console.error(e);
                    process.exit(1);
                }
            }

            console.log("Writing new migrations.json...");
            migrations[new Date().toJSON()] = columns;
            await writeFileAsync("./migrations.json", JSON.stringify(migrations, null, 4));
        }
    } else {
        console.log("Guilds table does not exist.\nGenerating schema...");

        let columns = Object.assign({}, defaultColumns);

        if (config.guildPrefix) columns.prefix = "TEXT";
        if (config.botspamChannel) columns.botspam = "BIGINT";

        columns = await addColumns(columns, config);

        console.log("Writing schema to migrations.json...");
        let migrations = {};
        migrations[new Date().toJSON()] = columns;
        await writeFileAsync("./migrations.json", JSON.stringify(migrations, null, 4));

        console.log("Creating query string...");
        let queryString = "CREATE TABLE guilds (";

        for (let column of Object.keys(columns)) {
            queryString += `${column} ${columns[column]}, `;
        }

        queryString += "PRIMARY KEY (id));";

        console.log("Creating table...");
        let res = await pg.query(queryString);
        console.log("Table created.");
        console.log(res);
    }
}

module.exports = migrate;
