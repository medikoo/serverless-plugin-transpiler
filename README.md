# serverless-plugin-transpiler
## Transpile lambda files when packaging lambda
## Plugin for Serverless v1

### Installation

	$ npm install serverless-plugin-transpiler

### Configuration (within `serverless.yml`)

1. Activate plugin in `serverless.yml`

```yaml
plugins:
  - serverless-plugin-transpiler
```

2. Configure _transpiler_ module, it should reside somewhere with your service.

_Transpiler_ should be a function that on `content` (file contents) and `filePath` (full path to module)
returns transpiled (if needed) content. Handling is as follows:

- Transpiler may be sync (return transpiled code directly) or async (may return promise)
- If resolved value from transpiler is either `null` or `undefined` then it is assumed that no transpilation 
was applied to this file, and original file content is passed as it is.

Example transpiler:

```javascript
module.exports = function (content, filePath) {
	if (!filePath.endsWith(".js")) return null; // transpile only JS files

	return transpileES2019Feature(content);
}
```

3. Configure path to preconfigured transpiler in `serverless.yml`

```yaml
custom:
	transpilerPath: "lib/transpile.js"
```
