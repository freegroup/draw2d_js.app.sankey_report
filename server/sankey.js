var persistence = require('./persistence');
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
        file = persistence.dir+"/"+file;
        var db = persistence.open();
        db.serialize(function() {
            db.all("SELECT conn, value from weight where file=?",file, function(err, row) {
                callback(row);
            });
        });
        db.close();
    },

    process: function(jsonId,json) {
        console.log("===process");

        var db = persistence.open();
        db.serialize(function() {
            var jsonDiff=[];
            // Try to load an already stored JSON document from the Database
            //
            db.get("SELECT doc FROM json where id=?", jsonId, function(err, row){
                if(err===null){
                    // INSERT the json into the DB for further processing
                    if(!row){
                        db.run("INSERT INTO  json values (?, ?)", jsonId, JSON.stringify(json));
                        jsonDiff = diff( {}, json);
                    }
                    // UPDATE them to make a DIFF
                    else{
                        db.run("UPDATE json set doc=? where id=?", JSON.stringify(json), jsonId);
                        jsonDiff = diff( JSON.parse(row.doc), json);
                    }

                    jsonDiff = jsonDiff.map(function(diff){ return diff.path.join(".");});
                    // process all sankey diagrams and update the status of each connection
                    //
                    glob(persistence.dir+"/*.sankey", {}, function (er, files) {
                        files.forEach(function (file) {
                            processSankey({db:db,jsonId:jsonId, json:json, diff:jsonDiff, file:file});
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




function processSankey(data){
    console.log("===processSankey");
    console.log(data);
    // draw2d is loaded and you can now read some documents into a HeadlessCanvas
    //
    var diagram = JSON.parse(fs.readFileSync(data.file));
    var canvas  = new draw2d.HeadlessCanvas();
    var reader  = new draw2d.io.json.Reader();
    reader.unmarshal(canvas, diagram);
    var figure = null;
    // check if we have already a status for the given document and sankey report
    //
    data.db.get("SELECT node FROM status where id=? and file=?", data.jsonId, data.file, function(err, record){
        if(err==null) {
            // we have processed this JSON document with this sankey diagram once before
            //
            if (record) {
                figure = canvas.getFigure(record.node);
                data = $.extend({},data, {figure:figure});
                processNode(data);
            }
            else {
                figure = canvas.getFigures().find(function (figure) {
                    return figure instanceof sankey.shape.Start;
                });
                // check if the "start" node match to the match conditions
                //
                data = $.extend({},data, {figure:figure});
                if(matchNode(data)) {
                    data.db.run("INSERT into status values (?,?,?)", data.jsonId, data.file, data.figure.id, function (err, record) {
                        processNode(data);
                    });
                }
                else{
                    // didn't match the start condition for the very first node.
                    // in this case the complete diagram isnT' responsive for this
                    // JSON document
                }
            }
        }
        else{
            console.log(err);
        }
    });
}


function processNode(data)
{
    console.log("==== processNode");

    var connection = null;
    data.figure.getOutputPorts().each(function(index, port){
        port.getConnections().each(function(index, conn){
            data = $.extend({},data, {figure:conn});
            if(matchNode(data)){
                connection = conn;
            }
            return connection===null; // false==abort criteria
        });
        return connection===null; // false==abort criteria
    });

    if(connection!==null){
        var nextFigure = connection.getTarget().getParent();
        data.db.run("UPDATE status set node=? where id=? and file=?", nextFigure.id, data.jsonId, data.file, function(err){
            if(err===null){
            //    console.log(connection.id, file, 0);
                data.db.all("SELECT conn, value, file from weight", function(err, row) {
            //        console.log(row);
                });
                data.db.run("INSERT OR IGNORE INTO weight VALUES(?, ?, ?)",connection.id, data.file, 0,function(err){
                    if(err!==null){
                        console.log(err);
                        return;
                    }
                    data.db.run("UPDATE weight set value=value+1 where conn=?", connection.id, function(err){
                        if(err!==null){
                            console.log(err);
                            return;
                        }
                        data.db.all("SELECT conn, value from weight where file=?",data.file, function(err, row) {
                            if(err!==null){
                                console.log(err);
                                return;
                            }
                            io.sockets.emit("connection:change",row);
                            if(nextFigure instanceof sankey.shape.End){
                                cleanupNode(data);
                            }
                        });
                    });
                });
            }
            else{
                console.log(err);
            }
        });
    }
}

function cleanupNode(data)
{
    console.log("=== cleanupNode "+data.file);
    data.db.run("DELETE from status where id=? and file=?",  data.jsonId, data.file,function(err){
//        console.log(err)
    });
}

function matchNode(data)
{
    console.log("=====matchNode:"+data.figure.NAME);
    var matched=true;
    var transitions = $.extend({},{transitions:[]},data.figure.getUserData()).transitions;

    // no constraint -> always true
    if(transitions.length===0){
        return true;
    }

    transitions.forEach(function(element){
        var path = element.jsonPath;
        var operation = element.operation;
        var value = element.value;
        var currentValue = attributeByPath(data.json,path);
        switch(operation){
            case "equals":
                console.log(">>>equals");
                matched = matched && (currentValue===value);
                break;
            case "!equals":
                console.log(">>>!equals");
                matched = matched && (currentValue!==value);
                break;
            case "null":
                console.log(">>>null");
                matched = matched && (currentValue===null);
                break;
            case "!null":
                console.log(">>>!null");
                matched = matched && (currentValue!==null);
                break;
            case "changed":
                console.log(">>>changed");
                matched = matched && (data.diff.indexOf(path)>=0);
                break;
            case "!changed":
                console.log(">>>!changed");
                matched = matched && (data.diff.indexOf(path)<0);
                break;
            case "undefined":
                console.log(">>>undefined");
                matched = matched && (typeof currentValue==="undefined");
                break;
        }
    });

    console.log("matched:"+matched);
    return matched;
}



function attributeByPath(o, s)
{
    console.log("===attributeByPath");

    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, '');           // strip a leading dot
    var a = s.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
        var k = a[i];
        if (k in o) {
            o = o[k];
        } else {
            return;
        }
    }
    return o;
}