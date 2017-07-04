"use strict";

const isCallable = require("es5-ext/object/is-callable")
    , isValue    = require("es5-ext/object/is-value")
    , deferred   = require("deferred")
    , path       = require("path")
    , fs         = require("fs")
    , stat       = require("fs2/stat")
    , readFile   = require("fs2/read-file")
    , archiver   = require("archiver")
    , globby     = require("globby");

module.exports = class FileTransformer {
	constructor (serverless) {
		const transpilerPath =
			serverless.service.custom && serverless.service.custom.transpilerPath;

		if (!transpilerPath) throw new Error("No file transpiler configuration found");
		const transpile = require(path.resolve(serverless.config.servicePath, transpilerPath));

		if (!isCallable(transpile)) throw new Error("Transpiler must be a function");

		const packagePlugin = serverless.pluginManager.plugins.find(
			plugin => plugin.constructor.name === "Package"
		);

		packagePlugin.zip = function (params) {
			const patterns = ["**"];

			params.exclude.forEach(pattern => {
				if (pattern.charAt(0) === "!") {
					patterns.push(pattern.substring(1));
				} else {
					patterns.push(`!${ pattern }`);
				}
			});

			// Push the include globs to the end of the array
			// (files and folders will be re-added again even if they were excluded beforehand)
			params.include.forEach(pattern => {
				patterns.push(pattern);
			});

			const zip = archiver.create("zip");
			// Create artifact in temp path and move it to the package path (if any) later
			const artifactFilePath = path.join(
				this.serverless.config.servicePath,
				".serverless",
				params.zipFileName
			);
			this.serverless.utils.writeFileDir(artifactFilePath);

			const output = fs.createWriteStream(artifactFilePath);

			const files = globby.sync(patterns, {
				cwd: this.serverless.config.servicePath,
				dot: true,
				silent: true,
				follow: true
			});

			if (files.length === 0) {
				const error = new this.serverless.classes.Error(
					"No file matches include / exclude patterns"
				);
				return Promise.reject(error);
			}
			const result = deferred();

			output.on("error", result.reject);
			output.on("close", () => result.resolve(artifactFilePath));
			zip.on("error", result.reject);

			output.on("open", () => {
				zip.pipe(output);

				deferred
					.map(files, filePath => {
						const fullPath = path.resolve(this.serverless.config.servicePath, filePath);
						return stat(fullPath)(stats => {
							if (stats.isDirectory(fullPath)) return null;
							return readFile(fullPath)(content =>
								deferred(transpile(String(content), fullPath))(transpiledContent =>
									zip.append(
										isValue(transpiledContent) ? transpiledContent : content,
										{
											name: filePath,
											mode: stats.mode
										}
									)
								)
							);
						});
					})
					.done(() => zip.finalize(), result.reject);
			});

			return result.promise;
		};
	}
};
