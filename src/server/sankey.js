var persistence = require('./persistence');
var env      = require('jsdom').env;
var diff     = require('deep-diff');
var vm       = require("vm");
var fs       = require('fs');
var glob     = require("glob");
var io       = null;

var queue = [];

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
    vm.runInThisContext(fs.readFileSync(__dirname + "/html/common/assets/javascript/common.js"));
    vm.runInThisContext(fs.readFileSync(__dirname + "/html/editor/assets/javascript/editor.js"));
});

var db = persistence.client;

module.exports = {
    socket:function( socket){
        io=socket;
    },

    suggestPath: function(query, callback){
       db.query("SELECT path from suggest_path where path like $1",["%"+query+"%"])
            .on('error', function(error) {console.log(error);})
            .on("row", function (row, result) {result.addRow(row);})
            .on("end", function (result) {
                callback(result.rows);
                console.log(result.rows);
            });
    },

    suggestValue: function(path,  query, callback){
        db.query("SELECT value from suggest_value where path=$1 and value like $2",[path,"%"+query+"%"])
            .on('error', function(error) {console.log(error);})
            .on("row", function (row, result) {result.addRow(row);})
            .on("end", function (result) {
                callback(result.rows);
            });
    },

    weights: function(file, callback){
        db.query("SELECT conn, value, file from weight where file=$1",[file])
            .on('error', function(error) {console.log(error);})
            .on("row", function (row, result) {result.addRow(row);})
            .on("end", function (result) {
              callback(result.rows);
            });
    },

    process: function(data) {
       queue.push(data);
        if(queue.length===1){
            setTimeout(processEvent,0);
        }
    }

};


function processEvent(){
    if(queue.length===0){
        return;
    }

    console.log("===========================================================================");
    console.log("===processEvent");
    console.log("===========================================================================");

    var callback = function(){
        if(queue.length>0){
            setTimeout(processEvent,0);
        }
    };
    var data = queue.shift();

    processFiles(data, callback);
    learnAutosuggest(data);
}

function learnAutosuggest(data){
    var obj = flatten(data.json);
    delete obj.OBJECT;
    delete obj.EVENT;

    Object.keys(obj).forEach(function(path){
        db.query("INSERT INTO suggest_path ( path ) values ($1) ON CONFLICT DO NOTHING",[ path]);
        db.query("INSERT INTO suggest_value( path, value ) values ($1, $2) ON CONFLICT DO NOTHING",[ path, obj[path]]);
    });
}

function processFiles(data, eventCallback){
    console.log("=== processFiles");

    // process all sankey diagrams and update the status of each connection
    //
    var filesToProcess = [];
    db.query("SELECT * from file")
        .on('error', function(error) {console.log(error);})
        .on("row", function (row, result) {result.addRow(row);})
        .on("end", function (result) {
            filesToProcess = result.rows;
            var callback = function(){
                if(filesToProcess.length>0){
                    setTimeout(function(){
                        processFile(filesToProcess.pop(),data,callback);
                    }, 0);
                }
                else{
                    eventCallback();
                }
            };
            callback();
    });
}


function processFile(file, data, doneCallback)
{
    data = $.extend({}, data, {file: file.id});
    console.log("=== processFile:"+data.file);
    // draw2d is loaded and you can now read some documents into a HeadlessCanvas
    //
    var diagram = JSON.parse(file.doc).content.diagram;
    var canvas  = new draw2d.HeadlessCanvas();
    var reader  = new draw2d.io.json.Reader();
    reader.unmarshal(canvas, diagram);
    var figure = null;

    var _process=function(data, callback){
        // check if we have already a status for the given document and sankey report
        //
        db.query("SELECT node FROM status where id=$1 and file=$2",[data.jsonId, data.file])
            .on('error', function(error) {console.log(error);callback();})
            .on("row", function (row, result) {result.addRow(row);})
            .on("end", function (result) {
                // we have processed this JSON document with this sankey diagram once before
                //
                var record = result.rows.length>0?result.rows[0]:undefined;
                if (record) {
                    figure = canvas.getFigure(record.node);
                    data = $.extend({}, data, {figure: figure});
                    processNode(data, callback);
                }
                else {
                    figure = canvas.getFigures().find(function (figure) {
                        return figure instanceof sankey.shape.Start;
                    });

                    // check if the "start" node match to the match conditions
                    //
                    data = $.extend({}, data, {figure: figure});
                    if (matchNode(data)) {
                        processNode(data, callback);
                    }
                    else {
                        callback();
                    }
                }
            });
    };

    // Try to load an already stored JSON document from the Database
    //
    db.query("SELECT doc FROM json where id=$1 and file=$2", [data.jsonId, data.file])
        .on('error', function(error) {console.log(error);})
        .on("row", function (row, result) {result.addRow(row);})
        .on("end", function(result){
            var row = result.rows.length>0?result.rows[0]:undefined;
            // INSERT the json into the DB for further processing
            if(!row){
                db.query("INSERT INTO  json (id, doc, file) values ($1, $2, $3)",[ data.jsonId, JSON.stringify(data.json), data.file])
                    .on('error', function(error) {console.log(error);})
                    .on("end", function(){
                        var jsonDiff = diff( {}, data.json);
                        data.jsonDiff = jsonDiff.map(function(diff){ return diff.path.join(".");});
                        _process(data, doneCallback);
                    });
            }
            // UPDATE them to make a DIFF
            else{
                db.query("UPDATE json set doc=$1 where id=$2 and file=$3", [JSON.stringify(data.json), data.jsonId, data.file])
                    .on('error', function(error) {console.log(error);})
                    .on("end", function(){
                        var jsonDiff = diff( JSON.parse(row.doc), data.json);
                        if(!jsonDiff){
                            jsonDiff = [];
                        }
                        data.jsonDiff = jsonDiff.map(function(diff){ return diff.path.join(".");});
                        _process(data, doneCallback);
                    });
            }
        });
}

function processNode(data, doneCallback){
    console.log("==== processNode");

    if(data.figure===null){
        doneCallback();
        return;
    }

    console.log("INSERT into status: ",data.jsonId, data.file, data.figure.id);
    db.query("INSERT into status (id, file, node) values ($1,$2,$3) ON CONFLICT (id, file) DO UPDATE SET node=$3", [data.jsonId, data.file, data.figure.id])
        .on('error', function(error) {console.log(error);doneCallback();})
        .on("row", function (row, result) {result.addRow(row);})
        .on("end", function (result) {

            var connection = null;
            data.figure.getOutputPorts().each(function(index, port){
                var connections = port.getConnections().asArray();
                connections.sort(function(a,b){
                    if(a.getUserData().transitions && b.getUserData().transitions) {
                        return b.getUserData().transitions.length - a.getUserData().transitions.length;
                    }
                    return 0;
                });

                connections.forEach(function(conn){
                    data = $.extend({},data, {figure:conn});
                    if(connection===null&&matchNode(data)){
                        connection = conn;
                    }
                });
                return connection===null; // false==abort criteria
            });
            console.log("Found connection for UPDATE status:", connection!==null);
            if(connection!==null){
                var nextFigure = connection.getTarget().getParent();
                console.log("UPDATE status: ",data.jsonId, data.file, nextFigure.id);
                db.query("UPDATE status set node=$1 where id=$2 and file=$3", [nextFigure.id, data.jsonId, data.file])
                    .on('error', function(error) {console.log(error);doneCallback();})
                    .on("end", function () {
                        console.log("       UPDATE STATUS done");
                        db.query('INSERT INTO weight ( conn, file, value) VALUES($1, $2, $3) ON CONFLICT (conn, file) DO UPDATE SET value=weight.value+1', [connection.id, data.file, 1])
                            .on('error', function(error) {console.log(error);doneCallback();})
                            .on("end", function (err) {
                                console.log("       INSERT WEIGHT done:",connection.id, data.file);
                                db.query('SELECT * from weight where file=$1', [ data.file])
                                    .on('error', function(error) {console.log(error);doneCallback();})
                                    .on("row", function (row, result) {result.addRow(row);})
                                    .on("end", function (result) {
                                        console.log("       EMIT WEIGHT done");
                                        io.sockets.emit("connection:change", result.rows);
                                        if (nextFigure instanceof sankey.shape.End) {
                                            cleanupNode(data);
                                        }
                                        dump();
                                        doneCallback();
                                    });
                                });
                    });
            }
            else{
                doneCallback();
            }
    });
}

function cleanupNode(data)
{
    console.log("=== cleanupNode: ",data.file, data.jsonId);
    db.query("DELETE from status where id=$1 and file=$2", [ data.jsonId, data.file]);
}

function matchNode(data)
{
    if(data.figure===null){
        return false;
    }

    console.log("===== matchNode:"+data.figure.NAME);
    var transitions = $.extend({},{transitions:[]},data.figure.getUserData()).transitions;
    console.log("   all transitions:",transitions);
    transitions = transitions.filter(function(e){return e.jsonPath!=="";});
    transitions = transitions.filter(function(e){return e.jsonPath;});

    console.log("  filtered transitions:",transitions);

    // no constraint -> always true
    if(transitions.length===0){
        return false;
    }

    var matched=true;
    transitions.forEach(function(element){
        try {
            var path = element.jsonPath;
            var operation = element.operation;
            var value = element.value;
            var currentValue = attributeByPath(data.json, path);
            switch (operation) {
                case "equals":
                    console.log(">>>equals");
                    matched = matched && (currentValue === value);
                    break;
                case "!equals":
                    console.log(">>>!equals");
                    matched = matched && (currentValue !== value);
                    break;
                case "null":
                    console.log(">>>null");
                    matched = matched && (currentValue === null);
                    break;
                case "!null":
                    console.log(">>>!null");
                    matched = matched && (currentValue !== null);
                    break;
                case "changed":
                    console.log(">>>changed");
                    matched = matched && (data.diff.indexOf(path) >= 0);
                    break;
                case "!changed":
                    console.log(">>>!changed");
                    matched = matched && (data.diff.indexOf(path) < 0);
                    break;
                case "undefined":
                    console.log(">>>undefined");
                    matched = matched && (typeof currentValue === "undefined");
                    break;
                default:
                    console.log("unhandled switch/case value ["+operation+"]");
            }
        }catch(exc){
            console.log(exc);
        }
    });

    matched = matched && transitions.length>0;

    console.log("matched:"+matched);
    return matched;
}


function dump(){
    console.log("Files:");
    db.query("SELECT * from file")
        .on('error', function(error) {console.log(error);})
        .on("row", function (row, result) {
            console.log("    ",row.id);
        })
        .on("end", function (result) {
            console.log("Status:");
            db.query("SELECT * from status")
                .on('error', function(error) {console.log(error);})
                .on("row", function (row, result) {
                   // console.log("    ",row.id, row.file, row.node);
                })
                .on("end", function (result) {
                    console.log("Weight:");
                    db.query("SELECT * from weight")
                        .on('error', function(error) {console.log(error);})
                        .on("row", function (row, result) {console.log("    ",row.conn, row.file, row.value);})
                        .on("end", function (result) {});
                });
        });
}

function attributeByPath(o, s)
{
    console.log("=== attributeByPath");

    if(!s) {
        return;
    }

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

function flatten (obj, path, result) {
    var key, val, _path;
    path = path || [];
    result = result || {};
    for (key in obj) {
        val = obj[key];
        _path = path.concat([key]);
        if (val instanceof Object) {
            flatten(val, _path, result);
        } else {
            result[_path.join('.')] = val;
        }
    }
    return result;
}