const Client = require("./structures/Client");

function Casca(options) {
    return new Client(options);
}

Casca.Client = Client;
Casca.CommandOutput = require("./structures/CommandOutput");
Casca.CommandTemplate = require("./structures/CommandTemplate");
Casca.Context = require("./structures/Context");
Casca.Strings = require("./structures/Strings");
Casca.SubcommandProcessor = require("./structures/SubcommandProcessor");

module.exports = Casca;
