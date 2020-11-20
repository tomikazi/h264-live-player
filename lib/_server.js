"use strict";


const WebSocketServer = require('ws').Server;
const Splitter = require('stream-split');
const merge = require('mout/object/merge');
const A4988 = require('a4988');

const NALseparator = new Buffer([0, 0, 0, 1]);//NAL break

const pan = new A4988({step: 27, dir: 22, enable: 17});
pan.step_size = 'SIXTEENTH';
const tilt = new A4988({step: 3, dir: 4, enable: 2});
tilt.step_size = 'SIXTEENTH';

var pdir, tdir,
    panning = false,
    tilting = false;

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
            pan.turn(pv).then(steps => { panning = false; } );
        }

        if (tv && !tilting) {
            tilting = true;
            tilt.direction = d.tilt < 0;
            tdir = tilt.direction ? "up" : "down";
            tilt.turn(tv).then(steps => { tilting = false; } );
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
