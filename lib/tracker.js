"use strict";

const Motor = require('./stepper');

class Tracker {

    constructor() {
        // Create pan and tilt motors
        this.pan = new Motor('Pan', {
            step: 27, dir: 22, enable: 17, limit: 23, reverse: true,
            min: -100 * 16, max: 100 * 16, home_steps: 230 * 16,
            home_backoff: -16 * 16, center_offset: -130 * 16
        });

        this.tilt = new Motor('Tilt', {
            step: 3, dir: 4, enable: 2, limit: 24, reverse: false,
            min: -30 * 16, max: +30 * 16, home_steps: 80 * 16,
            home_backoff: -16 * 16, center_offset: -26 * 16
        });

        let self = this;
        self.ready = false;
        this.tilt.start_home(function() { self.pan.start_home(function() { self.ready = true; }); });
    }

    pan_tilt(d, cb) {
        if (!this.ready) {
            return;
        }
        if (d.relative) {
            var pv = Math.round(d.pan/(d.slow ? 2 : 1)),
                tv = Math.round(d.tilt/(d.slow ? 4 : 1));

            if (pv) {
                this.pan.move(pv, 1, cb);
            }
            if (tv) {
                this.tilt.move(tv, 1, cb);
            }
        } else {
            this.pan.move_to(d.pan, 1, cb);
            this.tilt.move_to(d.tilt, 1, cb);
        }
    }

    pos() {
        return {pan: this.pan.pos, tilt: this.tilt.pos};
    }

    stop() {
        this.pan.off();
        this.tilt.off();
    }

}

module.exports = Tracker