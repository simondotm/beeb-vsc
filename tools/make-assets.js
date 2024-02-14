const { globSync } = require("glob");
const { join } = require("path");

const ASSETS_DIR = join(__dirname, '..', 'assets', 'jsbeeb', '**', '*');
console.log(`Making assets for ${ASSETS_DIR}`);

const files = globSync(ASSETS_DIR);

for (const file of files) {
	console.log(file);
}