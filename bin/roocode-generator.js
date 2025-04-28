const moduleAlias = require('module-alias');
const path = require('path');

// Map '@core' to the compiled source directory in dist
moduleAlias.addAlias('@core', path.join(__dirname, '../dist/src/core'));
moduleAlias.addAlias('@generators', path.join(__dirname, '../dist/src/generators'));
moduleAlias.addAlias('@memory-bank', path.join(__dirname, '../dist/src/memory-bank'));
moduleAlias.addAlias('@types', path.join(__dirname, '../dist/src/types'));

require('module-alias/register');

require(path.join(__dirname, '../dist/bin/roocode-generator.js'));
