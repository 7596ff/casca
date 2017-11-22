const config = require("./config.json");
const migrate = require("../migrate.js");

migrate(config).then(() => process.exit(0));
