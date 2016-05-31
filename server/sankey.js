var storage  = require('./storage');
var database = require('./database');
var env      = require('jsdom').env;
var diff     = require('deep-diff');
var vm       = require("vm");
var fs       = require('fs');
var sqlite3  = require('sqlite3').verbose();
var glob     = require("glob");

var io=null;

// create the environment for the headless canvas processing of the Draw2D definition
//
env("<html></html>", function (errors, window) {
    var $ = require('jquery')(window);
    global["navigator"] = {platform: "node.js"};
    global["window"] = window;
    global["document"] = {};
    global["debug"] = {error: console.log, warn: console.log};
    global["Raphael"] = {fn: {}, el: {}};
    global["$"] = $;

    vm.runInThisContext(fs.readFileSync(__dirname + "/lib/patched_Class.js"));
    vm.runInThisContext(fs.readFileSync(__dirname + "/lib/draw2d.js"));
    vm.runInThisContext(fs.readFileSync(__dirname + "/html/assets/javascript/app.js"));
});

module.exports = {
    socket:function( socket){
        io=socket;
    },

    weights: function(file, callback){
        file = storage.dir+"/"+file+".sankey";

        console.log("wait for open");
        var db = database.open();
        console.log("open done..");
        db.serialize(function() {
            console.log("select for file:"+file);
            db.all("SELECT conn, value from weight where file=?",file, function(err, row) {
                console.log(arguments);
                callback(row);
            });
        });
        db.close();
    },
    process: function(id,json) {
        var db = database.open();
        db.serialize(function() {
            var jsonDiff=[];
            // Try to load an already stored JSON document from the Database
            //
            db.get("SELECT doc FROM json where id=?", id, function(err, row){
                if(err===null){
                    // INSERT the json into the DB for further processing
                    if(!row){
                        db.run("INSERT INTO  json values (?, ?)", id, JSON.stringify(json));
                        jsonDiff = diff( {}, json);
                    }
                    // UPDATE them to make a DIFF
                    else{
                        db.run("UPDATE json set doc=? where id=?", JSON.stringify(json), id);
                        jsonDiff = diff( JSON.parse(row.doc), json);
                    }

                    jsonDiff = jsonDiff.map(function(diff){ return diff.path.join(".");});
                    console.log(jsonDiff);
                    // process all sankey diagrams and update the status of each connection
                    //
                    glob(storage.dir+"/*.sankey", {}, function (er, files) {
                        files.forEach(function (file) {
                            processSankey(db,id, json, file, jsonDiff);
                        });
                    });
                }
                else{
                    console.log(err);
                }
            });
        });
      //  db.close();
    }
};




function processSankey(db, id, json, file, jsonDiff){
    // draw2d is loaded and you can now read some documents into a HeadlessCanvas
    //
    var json = JSON.parse(fs.readFileSync(file));
    var canvas = new draw2d.HeadlessCanvas();
    var reader = new draw2d.io.json.Reader();
    reader.unmarshal(canvas, json);
    var figure = null;
    // check if we have already a status for the given document and sankey report
    //
    db.get("SELECT node FROM status where id=? and file=?", id, file, function(err, record){
        // we have processed this JSON document with this sankey diagram once before
        //
        if(record){
            console.log("continue");
            figure = canvas.getFigure(record.node);
            processNode(db,id, json,file,jsonDiff,figure);
        }
        else{
            console.log("start");
            figure = canvas.getFigures().find(function(figure){return figure instanceof sankey.shape.Start;});
            db.run("INSERT into status values (?,?,?)", id, file, figure.id ,function(err,record){
                processNode(db,id, json,file,jsonDiff,figure);
            });
        }
    });
}


function processNode(db, id, json, file, jsonDiff, figure)
{
    console.log("==== processNode");
    var connection = null;
    figure.getOutputPorts().each(function(index, port){
        port.getConnections().each(function(index, conn){
            console.log(conn.attr("userData"));
            var jsonPath = conn.attr("userData.jsonPath");
            console.log("jsonPath:"+jsonPath);
            if(jsonPath) {
                jsonDiff.some(function (path, index) {
                    // transisition found
                    if(path === jsonPath){
                        connection = conn;
                    }
                    return connection!==null; // true==abort criteria
                });
            }
            return connection===null; // false==abort criteria
        });
        return connection===null; // false==abort criteria
    });

    console.log("transistion found:"+(connection!==null));
    if(connection!==null){
        var nextFigure = connection.getTarget().getParent();
        db.run("UPDATE status set node=? where id=? and file=?", nextFigure.id, id, file, function(err){
            if(err===null){
                db.run("INSERT OR IGNORE INTO weight(conn, file, value) VALUES(?, ?, ?)",connection.id,file, 0,function(err){
                    db.run("UPDATE weight set value=value+1 where conn=?", connection.id, function(err){
                        db.all("SELECT conn, value from weight where file=?",file, function(err, row) {
                            io.sockets.emit("connection:change",row);
                        });

                    });
                });
            }
        });
    }
}