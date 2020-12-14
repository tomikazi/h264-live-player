"use strict";

const WebSocketServer = require('ws').Server;
const Splitter = require('stream-split');
const merge = require('mout/object/merge');
const mqtt = require('mqtt');

const NALseparator = new Buffer([0, 0, 0, 1]);//NAL break

// const A4988 = require('a4988');
// const pan = new A4988({step: 27, dir: 22, enable: 17});
// pan.step_size = 'SIXTEENTH';
// const tilt = new A4988({step: 3, dir: 4, enable: 2});
// tilt.step_size = 'SIXTEENTH';
//
// let pdir, tdir,
//     panning = false,
//     tilting = false;

const pfx = 'train'

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
        this.broadcast_status = this.broadcast_status.bind(this);
        this._on_connect = this._on_connect.bind(this);
        this.process_message = this.process_message.bind(this);
        this.process_command = this.process_command.bind(this);

        // Connect to the MQTT message bus and setup handlers.
        this.client = mqtt.connect('mqtt://' + options.mqttIp, {
            clientId: 'traincam',
            username: options.mqttUser,
            password: options.mqttPass,
            clean: true
        });

        this.client.on('connect', this._on_connect);
        this.client.on('message', this.process_message);
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

    broadcast_status(data) {
        this.wss.clients.forEach(function (socket) {
            socket.send(JSON.stringify({
                action: "status",
                data: data
            }));
        });
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
                self.process_command(d);
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


    _on_connect() {
        this.connected = true;
        console.log('MQTT connected');
        this.client.subscribe([pfx + '/status', pfx + '/view', pfx + '/track']);
    }

    process_message(topic, message, p) {
        let msg = message.toString();
        if (topic === pfx + '/status') {
            this.running = msg === 'on';
            console.log(`Train is ${this.running ? 'running' : 'stopped'}`);
        }
        this.broadcast_status({ topic: topic, message: msg });
    }

    process_command(d) {
        if (d.station) {
            this.client.publish(pfx + '/station', d.station);
        } else if (d.track) {
            this.client.publish(pfx + '/track', d.track);
        } else if (d.view) {
            this.client.publish(pfx + '/view', d.view);
        } else {
            this.pan_tilt(d);
        }
    }

    pan_tilt(d) {
        // var pv = Math.round(Math.abs(d.pan)/2),
        //     tv = Math.round(Math.abs(d.tilt)/8);
        //
        // if (pv && !panning) {
        //     panning = true;
        //     pan.direction = d.pan > 0;
        //     pdir = pan.direction ? "left" : "right";
        //     pan.turn(pv).then(steps => { pos.p = pos.p + (steps * pan.direction ? +1 : -1); panning = false; console.log(`Pos: ${pos.p}:${pos.t}`)} );
        // }
        //
        // if (tv && !tilting) {
        //     tilting = true;
        //     tilt.direction = d.tilt < 0;
        //     tdir = tilt.direction ? "up" : "down";
        //     tilt.turn(tv).then(steps => { pos.t = pos.t + (steps * tilt.direction ? +1 : -1); tilting = false; console.log(`Pos: ${pos.p}:${pos.t}`)} );
        // }
    }

}

module.exports = _Server;
