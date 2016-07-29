#!/usr/bin/env node
// Load the http module to create an http server.
var sankey  = require('./sankey');

var express =require('express');
var os   = require('os');
var fs   = require('fs');
var app  = express();
var http = require('http').Server(app);
var io   = require('socket.io')(http);
var glob = require("glob");
var path = require('path');
var bodyParser = require('body-parser');
var persistence = require('./persistence');
var basicAuth = require('basic-auth');


var auth = function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.send(401);
    }

    var user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    }

    if (user.name === 'admin' && user.pass === 'admin') {
        return next();
    } else {
        return unauthorized(res);
    }
};


sankey.socket(io);

// determine the ip address of the running node server
//
var ifaces = os.networkInterfaces();
var address ="*";
for (var dev in ifaces) {
    var iface = ifaces[dev].filter(function(details) {
        return details.family === 'IPv4' && details.internal === false;
    });
    if(iface.length > 0) address = iface[0].address;
}


// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 6800;

// provide the DigitalTrainingStudio WebApp with this very simple
// HTTP server. good enough for an private raspi access
//
app.use("/common",   [auth, express.static(__dirname+'/html/common')]);
app.use("/editor",   [auth, express.static(__dirname+'/html/editor')]);
app.use("/viewer",   [      express.static(__dirname+'/html/viewer')]);
app.use("/dashboard",[auth, express.static(__dirname+'/html/dashboard')]);
app.use("/index",    [      express.static(__dirname+'/html/index')]);

// to support JSON-encoded bodies
app.use(bodyParser.json({limit: '50mb'}));
// to support URL-encoded bodies
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));


app.get('/backend/file/list', function (req, res) {
    var query = persistence.client.query("SELECT * from file");

    query.on("row", function (row, result) {
        result.addRow(row);
    });

    query.on("end", function (result) {
        var json = JSON.stringify( {files:result.rows.map(function(f){return {id: f.id, base64Image: f.base64image }})});
        console.log(json);
        res.setHeader('Content-Type', 'application/json');
        res.send(json);
    });
});

app.post('/backend/file/get', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    var query = persistence.client.query("SELECT * from file where id=$1",[req.body.id]);

    query.on("row", function (row, result) {
        result.addRow(row);
    });

    query.on("end", function (result) {
        res.setHeader('Content-Type', 'application/json');
        if(result.rows.length>0) {
            res.send(result.rows[0].doc);
        }
        else{
            res.status(404).send('Not found');
        }
    });
});

app.post('/backend/file/save', function (req, res) {
    persistence.client.query('INSERT into file (id, doc, base64Image) VALUES($1, $2, $3) ON CONFLICT (id) DO UPDATE SET doc = $2, base64Image=$3',  [req.body.id, req.body.content, req.body.base64Image],function(){
        res.send('true');
    });
});

app.post('/backend/sankey/weights', function (req, res) {
    sankey.weights(req.body.id , function(records){
        res.send(records);
    });
});

app.get('/delete/:file', function (req, res) {
    persistence.cleanupForFile(req.params.file);
    res.send(req.params.file);
});

app.post('/backend/suggestPath', function(req, res){
    var body = req.body;
    var query  = body.query;
    sankey.suggestPath(query, function(records){
        res.send(records.map(function(obj){return {value:obj.path};}));
    });
});

app.post('/backend/suggestValue/', function(req, res){
    var body  = req.body;
    var path  = body.path;
    var query = body.query;
    sankey.suggestValue(path, query, function(records){
        res.send(records.map(function(obj){return {value:obj.value};}));
    });
});

app.post('/backend/hook', function(req, res){
    var body = req.body;
    var id  = body.id;
    var json = {
        EVENT : body.event,  // deprecated
        OBJECT: body.object, // deprecated

        event  : body.event,
        type   : body.object,
        object : body.content
    };
    sankey.process({jsonId:body.object+":"+id,json:json});
    res.send('true');
});

http.listen(port, function(){
    console.log('Serve directory "'+__dirname+'"');
    console.log('Admin UI: on http://'+address+':'+port+'/editor');
    console.log('WebHook URL: on http://'+address+':'+port+'/backend/hook');
});
