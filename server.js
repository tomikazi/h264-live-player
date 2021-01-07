"use strict";

const http = require('http');
const express = require('express');
const args = require('minimist')(process.argv.slice(2))

const WebStreamerServer = require('./lib/raspivid');

const app = express();
const url = args['url'] || '/camera'

//public website
app.use(express.static(__dirname + '/public'));
app.use(url, express.static(__dirname + '/vendor/dist'));

const server = http.createServer(app);
const streamer = new WebStreamerServer(server, {});

console.log(`Starting server on ${url}...`);
server.listen(5000);

process.on('SIGINT', function () {
    console.log('Caught interrupt signal');
    streamer.stop();
    process.exit();
});
