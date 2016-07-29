var db = require('pg');
//db.defaults.ssl = true;
var conString = process.env.DATABASE_URL;
var client = new db.Client(conString);
client.connect();


client.query("CREATE TABLE IF NOT EXISTS json          (id VARCHAR(500) PRIMARY KEY,  doc TEXT, file VARCHAR(500) NOT NULL)");
client.query("CREATE TABLE IF NOT EXISTS status        (id VARCHAR(500),  file VARCHAR(500) NOT NULL, node VARCHAR(500),  UNIQUE(id, file))");
client.query("CREATE TABLE IF NOT EXISTS weight        (conn VARCHAR(500), file VARCHAR(500) NOT NULL, value bigint,   UNIQUE(conn, file))");
client.query("CREATE TABLE IF NOT EXISTS file          (id VARCHAR(500) PRIMARY KEY,  doc TEXT, base64image TEXT)");
client.query("CREATE TABLE IF NOT EXISTS suggest_path  (path VARCHAR(500) PRIMARY KEY)");
client.query("CREATE TABLE IF NOT EXISTS suggest_value (path VARCHAR(500) , value VARCHAR(500), UNIQUE(path, value))");

module.exports = {

    client:client,


    cleanupForFile:function(file)
    {
        client.query("DELETE from weight where file=$1",[file]);
        client.query("DELETE from json   where file=$1",[file]);
        client.query("DELETE from status where file=$1",[file]);
        client.query("DELETE from file   where id=$1"  ,[file]);
    }
};


