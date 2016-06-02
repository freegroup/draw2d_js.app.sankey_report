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


var port = 6800;

// provide the DigitalTrainingStudio WebApp with this very simple
// HTTP server. good enough for an private raspi access
//
app.use(express.static(__dirname+'/html'));
// to support JSON-encoded bodies
app.use( bodyParser.json() );
// to support URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true}));


app.get('/backend/file/list', function (req, res) {
    glob(persistence.dir+"/*.sankey", {}, function (er, files) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify( {files:files.map(function(f){return {id:path.basename(f)};})}));
    });
});

app.post('/backend/file/get', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(persistence.dir+"/"+req.body.id).pipe(res);
});

app.post('/backend/file/save', function (req, res) {
    fs.writeFile(persistence.dir + "/" + req.body.id, req.body.content, function (err) {
        persistence.cleanupForFile(req.body.id);
        res.send('true');
    });
});

app.post('/backend/sankey/weights', function (req, res) {
    sankey.weights(req.body.id , function(records){
        res.send(records);
    });
});

app.post('/backend/hook', function(req, res){
    var id  = req.body.id;
    var json = JSON.parse(req.body.content);
    sankey.process(id,json);
    res.send('true');
});

http.listen(port, function(){
    console.log('listening on http://'+address+':'+port+'/');
});
