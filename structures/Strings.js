const sprintf = require("sprintf-js").sprintf;

class Strings {
    constructor() {
        this.strings = {};

        for (let i = arguments.length - 1; i >= 0; i--) {
            for (let name of Object.keys(arguments[i])) {
                this.strings[name] = arguments[i][name];
            }
        }

        this.keys = Object.keys(this.strings);
    }

    get(str) {
        if (!~this.keys.indexOf(str)) {
            return str;
        }

        if (arguments.length == 1) {
            return this.strings[str];
        }

        return sprintf(this.strings[str], ...Array.from(arguments).slice(1));
    }

    all(str, delim) {
        let res = this.keys.filter((item) => item.includes(str));

        if (!res.length) {
            return false;
        }

        res = res.map((item) => this.strings[item]);
        if (delim !== "array") res = res.join(delim || "\n");

        if (arguments.length <= 2) {
            return res;
        }

        if (!Array.isArray(res)) {
            return sprintf(res, ...Array.from(arguments).slice(2));
        }

        let temp = res.join("\n");
        temp = sprintf(temp, ...Array.from(arguments).slice(2));
        return temp.split("\n");
    }
}

module.exports = Strings;
