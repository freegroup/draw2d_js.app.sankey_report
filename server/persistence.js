var sqlite3 = require('sqlite3').verbose();
var fs   = require('fs');
var storageDir =process.env.HOME+ "/.sankey";

// get the local storage for files in the home directory of the
// current user
//
try {fs.mkdirSync(storageDir);} catch(e) {}

var db = new sqlite3.Database(storageDir+'/json.db');
db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS json   (id STRING PRIMARY KEY,  doc TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS status (id STRING,  file STRING, node STRING,  UNIQUE(id, file))");
    db.run("CREATE TABLE IF NOT EXISTS weight (conn STRING PRIMARY KEY, file STRING, value LONG)");
});
db.close();



module.exports = {

    dir : storageDir,

    open: function(){
        return new sqlite3.Database(storageDir+'/json.db');
    },

    cleanupForFile:function(file)
    {
        file = storageDir+"/"+file;
        var db = new sqlite3.Database(storageDir+'/json.db');
        db.serialize(function() {
            db.run("DELETE from weight where file=?",file);
            db.run("DELETE from status where file=?",file);
        });
        db.close();
    }
};