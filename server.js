"use strict";

const http = require('http');
const express = require('express');

const WebStreamerServer = require('./lib/raspivid');
const secret = require('./secret');

const app = express();

//public website
app.use(express.static(__dirname + '/public'));
app.use('/camera', express.static(__dirname + '/vendor/dist'));

const server = http.createServer(app);
const streamer = new WebStreamerServer(server, {
    mqttIp: secret.mqttIp,
    mqttUser: secret.mqttUser,
    mqttPass: secret.mqttPass,
});

console.log("Starting server...");
server.listen(5000);

process.on('SIGINT', function () {
    console.log("Caught interrupt signal");
    streamer.stop();
    process.exit();
});
