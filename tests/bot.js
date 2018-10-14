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
    console.error(error);
    console.error(`${new Date().toJSON()} ${status.text}`);
});

client.on("command", (output, result) => {
    console.log(`executed ${output.text}`);
    console.log(output.ctx.content)
});

client.load().then(() => {
    client.connect();
});
