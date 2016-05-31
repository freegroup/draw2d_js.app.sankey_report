var storage = require('./storage');
var sqlite3 = require('sqlite3').verbose();


var db = new sqlite3.Database(storage.dir+'/json.db');
db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS json   (id STRING PRIMARY KEY,  doc TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS status (id STRING,  file STRING, node STRING,  UNIQUE(id, file))");
    db.run("CREATE TABLE IF NOT EXISTS weight (conn STRING PRIMARY KEY, file STRING, value LONG)");
});
db.close();



module.exports = {

    open: function(){
        return new sqlite3.Database(storage.dir+'/json.db');
    }
};