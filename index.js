"use strict";

const isPlainFunction = require("es5-ext/object/is-plain-function")
    , isValue         = require("es5-ext/object/is-value")
    , BbPromise       = require("bluebird")
    , fs              = BbPromise.promisifyAll(require("graceful-fs"))
    , path            = require("path");

module.exports = class ServerlessPluginTranspiler {
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
			fs
				.readFileAsync(fullPath)
				.then(content =>
					BbPromise.resolve(transpile(content, fullPath)).then(
						transpiledContent =>
							isValue(transpiledContent) ? transpiledContent : content
					));
	}
};
