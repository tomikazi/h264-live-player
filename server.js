"use strict";

var fs = require('fs');
const http = require('http');
const express = require('express');
const args = require('minimist')(process.argv.slice(2))

const WebStreamerServer = require('./lib/raspivid');

const app = express();
const url = args['url'] || '/camera'

const tokensFile = __dirname + '/tokens'

// Poor-man's access control
let validateToken = function(token) {
    if (!fs.existsSync(tokensFile)) {
        return true;
    }
    if (token.length === 36) {
        let data = fs.readFileSync(tokensFile);
        if (data && data.includes(token)) {
            return true;
        }
    }
    return false;
}

let gateKeeper = function (req, res, next) {
    if (req.path === url + '/' || req.path === url + '/index.html') {
        console.log(`New visitor to ${req.path}; token=${req.query.v}`);
        if (req.query.v && validateToken(req.query.v)) {
            next();
        } else {
            res.status(403).send("Sorry! Zakázáno!");
        }
    } else {
        next();
    }
}

app.use(gateKeeper);
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
