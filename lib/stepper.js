"use strict";

const Gpio = require('pigpio').Gpio;
const A4988 = require('a4988');

class Motor {

    constructor(name, options) {
        this.name = name;
        this.min = options.min;
        this.max = options.max;
        this.mid = (options.max - options.min) / 2;
        this.home_steps = options.home_steps;
        this.home_direction = options.home_direction;
        this.homing = false;
        this.moving = false;

        this.ctl = new A4988({
            step: options.step,
            dir: options.dir,
            enable: options.enable
        });

        if (this.limit > 0) {
            this.limit = new Gpio(options.limit, {
                mode: Gpio.INPUT,
                pullUpDown: Gpio.PUD_DOWN,
                edge: Gpio.EITHER_EDGE,
            });

            this.limit.on('interrupt', (level) => {
                console.log(`${this.name} limit: ${level}`);
                if (this.homing && !level) {
                    this.ctl.stop();
                }
            });
        }

        this.ctl.enabled = true;
        this.ctl.step_size = 'SIXTEENTH';

        this.move = this.move.bind(this);
        this.move_to = this.move_to.bind(this);
        this.set_home = this.set_home.bind(this);
        this.start_home = this.start_home.bind(this);
        this._finish_home = this._finish_home.bind(this);
    }

    move_to(pos, delay) {
        // console.log(`${this.name} moving to ${pos}`);
        let delta = pos - this.pos;
        return this.move(delta, delay);
    }

    move(by, delay) {
        if (by) {
            let nextPos = this.pos + by;
            if (nextPos < this.min || nextPos > this.max) {
                console.error(`${this.name} cannot move past limit to ${nextPos}`)
            } else {
                // console.log(`${this.name} moving by ${by}`);
                if (delay) {
                    this.ctl.delay = delay;
                }
                this.moving = true;
                this.ctl.direction = by < 0;
                return this.ctl.turn(Math.abs(by))
                    .then(steps => {
                        this.pos = this.pos + (steps * (by < 0 ? -1 : +1));
                        this.moving = false;
                    });
            }
        }
        return Promise.resolve();
    }

    set_home() {
        console.log(`${this.name} homed`);
        this.ctl.delay = 1;
        this.pos = 0;
        this.homing = false;
        this.moving = false;
    }

    off() {
        console.log(`${this.name} disabled`);
        this.ctl.enabled = false;
    }

    _finish_home(steps) {
        if (steps < this.home_steps) {
            set_home();
            this.move(this.min)
                .then(steps => {
                    this.move(this.mid)
                        .then(steps => {
                            console.log(`${this.name} moved to center`);
                        })
                })
        } else {
            console.error(`Unable to reach ${this.name} limit switch`);
        }
    }

    start_home() {
        if (!this.limit.digitalRead()) {
            console.log(`${this.name} at limit... advancing...`);
            this.move(16 * 16).then(steps => {
                this.start_home();
            });
        } else {
            this.homing = true;
            this.ctl.delay = 5;
            console.log(`${this.name} starting to home (-${this.home_steps})`);
            this.move(-this.home_steps)
                .then(steps => this._finish_home(steps));
        }
    }

}

module.exports = Motor
