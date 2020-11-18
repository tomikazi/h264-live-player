"use strict";

const http = require('http');
const express = require('express');

const WebStreamerServer = require('./lib/raspivid');

const app = express();

//public website
app.use(express.static(__dirname + '/public'));
app.use('/camera', express.static(__dirname + '/vendor/dist'));

const server = http.createServer(app);
const silence = new WebStreamerServer(server);

console.log("Starting server...");
server.listen(5000);
