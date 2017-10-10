"use strict";

const isPlainFunction = require("es5-ext/object/is-plain-function")
    , isValue         = require("es5-ext/object/is-value")
    , deferred        = require("deferred")
    , path            = require("path")
    , readFile        = require("fs2/read-file");

module.exports = class FileTransformer {
	constructor(serverless) {
		const transpilerPath =
			serverless.service.custom && serverless.service.custom.transpilerPath;

		if (!transpilerPath) throw new Error("No file transpiler configuration found");
		const transpile = require(path.resolve(serverless.config.servicePath, transpilerPath));

		if (!isPlainFunction(transpile)) throw new Error("Transpiler must be a function");

		const packagePlugin = serverless.pluginManager.plugins.find(
			plugin => plugin.constructor.name === "Package"
		);

		packagePlugin.getFileContent = fullPath =>
			readFile(fullPath)(content =>
				deferred(transpile(String(content), fullPath))(
					transpiledContent => isValue(transpiledContent) ? transpiledContent : content
				));
	}
};
