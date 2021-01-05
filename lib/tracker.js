"use strict";

const Motor = require('./stepper');

class Tracker {

    constructor() {
        // Create pan and tilt motors
        this.pan = new Motor('Pan', {
            step: 27, dir: 22, enable: 17, limit: -23,
            min: -100 * 16, max: 100 * 16, home_steps: 200 * 16,
        });

        this.tilt = new Motor('Tilt', {
            step: 3, dir: 4, enable: 2, limit: -24,
            min: -30 * 16, max: +30 * 16, home_steps: 60 * 16,
        });

        this.pan.set_home()
        this.tilt.set_home()
    }

    pan_tilt(d) {
        var pv = Math.round(d.pan/2),
            tv = Math.round(d.tilt/8);

        if (pv) {
            this.pan.move(pv);
        }

        if (tv) {
            this.tilt.move(tv);
        }
    }

    stop() {
        this.pan.off();
        this.tilt.off();
    }

}

module.exports = Tracker