const config = require("./config.json");
const Casca = require("../index.js");

const client = new Casca(config);

client.on("ready", () => {
    console.log("Ready.");
});

client.on("info", (message) => {
    console.log(message);
});

client.on("bot", (message) => {
    console.log(message);
});

client.on("error", (status, error) => {
    console.error(status);
    console.error(error);
});

client.on("command", (command, output, result) => {
    console.log(`executed ${command}`);
});

client.load().then(() => {
    client.connect();
});
