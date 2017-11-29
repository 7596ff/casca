const Client = require("./structures/Client");

function Casca(options) {
    return new Client(options);
}

Casca.Client = Client;
Casca.Context = require("./structures/Context");
Casca.Strings = require("./structures/Strings");

module.exports = Casca;
