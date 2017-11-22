const config = require("./config.json");
const Casca = require("../index.js");

const client = new Casca(config);

client.on("ready", () => {
    console.log("Ready.");
});

client.on("info", (message) => {
    console.log(message);
});

client.on("error", (error, id) => {
    console.error(error);
});

client.load().then(() => {
    client.connect();
});
