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
app.use(express.static(__dirname+'/html'));
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
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify( {files:result.rows.map(function(f){return {id: f.id};})}));
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
        res.send(result.rows[0].doc);
    });
});

app.post('/backend/file/save', function (req, res) {
    persistence.client.query('INSERT into file (id, doc) VALUES($1, $2) ON CONFLICT (id) DO UPDATE SET doc = $3',  [req.body.id, req.body.content,req.body.content],function(){
        res.send('true');
    });
});

app.post('/backend/sankey/weights', function (req, res) {

    sankey.weights(req.body.id , function(records){
        res.send(records);
    });

});

app.post('/backend/hook', function(req, res){
    var body = req.body;
    var id  = body.id;
    var json = body.content;
    json.EVENT = body.event;
    json.OBJECT= body.object;
    console.log(json);
    sankey.process({jsonId:body.object+":"+id,json:json});
    res.send('true');
});

http.listen(port, function(){
    console.log('serve directory "'+__dirname+'"');
    console.log('listening on http://'+address+':'+port+'/');
});
