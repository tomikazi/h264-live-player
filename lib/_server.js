"use strict";

const WebSocketServer = require('ws').Server;
const Splitter = require('stream-split');
const merge = require('mout/object/merge');
const A4988 = require('a4988');
const mqtt = require('mqtt');
const secret = require('../secret');

const NALseparator = new Buffer([0, 0, 0, 1]);//NAL break

const pan = new A4988({step: 27, dir: 22, enable: 17});
pan.step_size = 'SIXTEENTH';
const tilt = new A4988({step: 3, dir: 4, enable: 2});
tilt.step_size = 'SIXTEENTH';

let pdir, tdir,
    panning = false,
    tilting = false,
    pos = {
        p: 0,
        t: 0,
    },
    points = {
        'Forest': { p: 0, t: 0},
        'Track 1': { p: 80, t: 13},
        'Track 2': { p: 100, t: 13},
        'Meadow': { p: 150, t: 20},
        'Tunnel': { p: 50, t: 0}
    };


let mclient = mqtt.connect('mqtt://' + secret.mqttIp, {
    clientId: 'traincam',
    username: secret.mqttUser,
    password: secret.mqttPass,
    clean: true
});

let mconnected = false,
    location,
    nextTrack;

mclient.on('connect', function() {
    mconnected = true;
    console.log('MQTT connected');

    mclient.subscribe(['train/location', 'train/track/status']);
});
mclient.on('error', function() {
    mconnected = false;
    console.error('MQTT connection failed');
});
mclient.on('message', function(topic, message, p) {
    if (topic === 'train/location') {
        if (location !== message) {
            location = message;
            console.log(`Location: ${location}`);

            if (location === 'Forest') {
                moveTo(nextTrack);
            } else if (location === 'Tunnel') {
                resetCamera()
            }

            moveTo(location)
        }
    } else if (topic === 'train/track/status') {
            nextTrack = message;
    }
});

function resetCamera() {
    moveTo('Forest');
}

function moveTo(to) {
    console.log(`Moving to ${to}`);
    let nextPos = points[to];
    if (nextPos) {
        panMove(pos.p - nextPos.p, 2);
        tiltMove(pos.t - nextPos.t, 2);
    }
}

function panMove(delta, delay) {
    pan.direction = delta < 0;
    pan.delay = delay;
    pan.turn(Math.abs(delta))
        .then(steps => { pos.p = pos.p + (steps * pan.direction ? +1 : -1); console.log(`Pos: ${pos.p}:${pos.t}`)} );
}

function tiltMove(delta, delay) {
    tilt.direction = delta < 0;
    tilt.delay = delay;
    tilt.turn(Math.abs(delta))
        .then(steps => { pos.t = pos.t + (steps * pan.direction ? +1 : -1); console.log(`Pos: ${pos.p}:${pos.t}`)} );
}

class _Server {

    constructor(server, options) {
        this.options = merge({
            width: 1280,
            height: 720,
        }, options);

        this.wss = new WebSocketServer({server});

        this.new_client = this.new_client.bind(this);
        this.start_feed = this.start_feed.bind(this);
        this.broadcast = this.broadcast.bind(this);

        this.wss.on('connection', this.new_client);
    }

    start_feed() {
        var readStream = this.get_feed();
        this.readStream = readStream;

        readStream = readStream.pipe(new Splitter(NALseparator));
        readStream.on("data", this.broadcast);
    }

    get_feed() {
        throw new Error("to be implemented");
    }

    stop_feed() {
        throw new Error("to be implemented");
    }

    broadcast(data) {
        this.wss.clients.forEach(function (socket) {

            if (socket.buzy)
                return;

            socket.buzy = true;
            socket.buzy = false;

            socket.send(Buffer.concat([NALseparator, data]), {binary: true}, function ack(error) {
                socket.buzy = false;
            });
        });
    }

    processPanAndTilt(d) {
        var pv = Math.round(Math.abs(d.pan)/2),
            tv = Math.round(Math.abs(d.tilt)/8);

        if (pv && !panning) {
            panning = true;
            pan.direction = d.pan > 0;
            pdir = pan.direction ? "left" : "right";
            pan.turn(pv).then(steps => { pos.p = pos.p + (steps * pan.direction ? +1 : -1); panning = false; console.log(`Pos: ${pos.p}:${pos.t}`)} );
        }

        if (tv && !tilting) {
            tilting = true;
            tilt.direction = d.tilt < 0;
            tdir = tilt.direction ? "up" : "down";
            tilt.turn(tv).then(steps => { pos.t = pos.t + (steps * tilt.direction ? +1 : -1); tilting = false; console.log(`Pos: ${pos.p}:${pos.t}`)} );
        }
    }

    new_client(socket) {
        var self = this;
        console.log('New viewer');

        socket.send(JSON.stringify({
            action: "init",
            width: this.options.width,
            height: this.options.height,
        }));

        socket.on("message", function (data) {
            if (data[0] === '{') {
                let d = JSON.parse(data);
                self.processPanAndTilt(d);
            } else {
                var action = ("" + data).split(' ')[0];
                console.log("Incoming action '%s'", action);

                if (action === "REQUESTSTREAM") {
                    self.start_feed();
                }
                if (action === "STOPSTREAM") {
                    self.stop_feed();
                }
            }
        });

        socket.on('close', function () {
            if (self.readStream) {
                self.readStream.end();
            }
            console.log('stopping client interval');
            self.stop_feed();
        });
    }

}

module.exports = _Server;
