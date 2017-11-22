const config = require("./config.json");
const Casca = require("../index.js");

const client = new Casca(config);

client.connect();
