"use strict";

const mqtt = require('mqtt');
const Motor = require('./stepper');

const points = {
    'Forest': {p: -10, t: -2},
    'Track 1': {p: -30, t: -8},
    'Track 2': {p: -40, t: -10},
    'Meadow': {p: -60, t: -10},
    'Tunnel': {p: -20, t: -4}
};

const pfx = 'Xtrain'

class TrainTracker {

    constructor(options) {
        this.location = 'unknown';
        this.nextTrack = 'unknown';

        // Create pan and tilt motors
        this.pan = new Motor('Pan', {
            step: 27, dir: 22, enable: 17, limit: -23,
            min: -100 * 16, max: 100 * 16, home_steps: 200 * 16,
        });

        this.tilt = new Motor('Tilt', {
            step: 3, dir: 4, enable: 2, limit: -24,
            min: -40 * 16, max: +40 * 16, home_steps: 60 * 16,
        });

        this.pan.set_home()
        this.tilt.set_home()

        this._on_connect = this._on_connect.bind(this);
        this.process_message = this.process_message.bind(this);
        this.track = this.track.bind(this);


        // Connect to the MQTT message bus and setup handlers.
        this.client = mqtt.connect('mqtt://' + options.mqttIp, {
            clientId: 'traincam',
            username: options.mqttUser,
            password: options.mqttPass,
            clean: true
        });

        this.client.on('connect', this._on_connect);
        this.client.on('message', this.process_message);
    }

    _on_connect() {
        this.connected = true;
        console.log('MQTT connected');
        this.client.subscribe([pfx + '/status', pfx + '/location', pfx + '/track/status']);
    }

    process_message(topic, message, p) {
        let msg = message.toString();
        if (topic === pfx + '/location') {
            if (this.location !== msg) {
                this.location = msg;
                console.log(`Location: ${this.location}`);
                this.track();
            }

        } else if (topic === pfx + '/track/status') {
            this.nextTrack = msg;
            console.log(`Next track: ${this.nextTrack}`);

        } else if (topic === pfx + '/status' && msg === 'off') {
            this.move_to(this.location);
        }
    }

    track() {
        if (this.location === 'Forest' && this.nextTrack !== 'unknown') {
            this.move_to(this.nextTrack);
        } else if (this.location === 'Tunnel') {
            this.reset();
        } else {
            this.move_to('Tunnel', 10);
        }
    }

    move_to(loc, pan_delay= 4) {
        let pos = points[loc];
        if (pos) {
            console.log(`Tracking to ${this.location}...`);
            this.pan.move_to(pos.p * 16, pan_delay);
            this.tilt.move_to(pos.t * 16, 10);
        }
    }

    reset() {
        console.log('Resetting...');
        this.move_to('Forest');
    }

    stop_tracking() {
        this.pan.off();
        this.tilt.off();
    }

}

module.exports = TrainTracker