"use strict";

const WebSocketServer = require('ws').Server;
const Splitter = require('stream-split');
const merge = require('mout/object/merge');
const Tracker = require("./tracker");

const NALseparator = new Buffer([0, 0, 0, 1]);//NAL break

class _Server {

    constructor(server, options) {
        this.options = merge({
            width: 1280,
            height: 720,
        }, options);

        this.wss = new WebSocketServer({server});
        this.tracker = new Tracker();

        this.new_client = this.new_client.bind(this);
        this.start_feed = this.start_feed.bind(this);
        this.broadcast = this.broadcast.bind(this);
        this.broadcast_status = this.broadcast_status.bind(this);
        this.on_motion = this.on_motion.bind(this);

        this.wss.on('connection', this.new_client);
    }

    start_feed() {
        let readStream = this.get_feed();
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
        let self = this;
        console.log('New viewer');

        socket.send(JSON.stringify({
            action: "init",
            width: this.options.width,
            height: this.options.height,
        }));

        socket.send(JSON.stringify({
            action: 'status', data: { name: 'Pan', pos: self.tracker.pos().pan }
        }));

        socket.send(JSON.stringify({
            action: 'status', data: { name: 'Tilt', pos: self.tracker.pos().tilt }
        }));

        socket.on("message", function (data) {
            if (data[0] === '{') {
                let d = JSON.parse(data);
                self.process_command(d);
            } else {
                let action = ("" + data).split(' ')[0];
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

    process_command(d) {
        this.tracker.pan_tilt(d, this.on_motion);
    }

    on_motion(d) {
        this.broadcast_status(d);
    }

    stop() {
        this.tracker.stop();
    }

}

module.exports = _Server;
