var fs   = require('fs');

var storageDir =process.env.HOME+ "/.sankey";

// get the local storage for files in the home directory of the
// current user
//
try {fs.mkdirSync(storageDir);} catch(e) {}

module.exports = {
    dir : storageDir
};
