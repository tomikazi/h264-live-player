"use strict";

const http = require('http');
const express = require('express');

const WebStreamerServer = require('./lib/relay');

const app = express();
const url = '/camera'

//public website
app.use(express.static(__dirname + '/public'));
app.use(url, express.static(__dirname + '/vendor/dist'));

const server = http.createServer(app);
const broker = new WebStreamerServer(server, {});

console.log(`Starting camera broker...`);
server.listen(6000);

process.on('SIGINT', function () {
    console.log('Caught interrupt signal');
    broker.stop();
    process.exit();
});
