"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
/**
 * Read the workspace configuration for 'adzan-reminder' and return a AdzanConfig.
 * @return {AdzanConfig} config object
 */
exports.getConfig = () => {
    const conf = vs.workspace.getConfiguration('adzan-reminder');
    return {
        city: conf.get('city', 'Jakarta'),
        country: conf.get('country', 'Indonesia')
    };
};
//# sourceMappingURL=configuration.js.map