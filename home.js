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

        this.ctl = new A4988({
            step: options.step,
            dir: options.dir,
            enable: options.enable
        });

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

        this.ctl.step_size = 'SIXTEENTH';

        this.move = this.move.bind(this);
        this.start_home = this.start_home.bind(this);
        this._finish_home = this._finish_home.bind(this);
    }

    move(steps) {
        console.log(`${this.name} moving by ${steps}`);
        this.ctl.direction = steps < 0 ? this.home_direction : !this.home_direction;
        return this.ctl.turn(Math.abs(steps));
    }

    _finish_home(steps) {
        if (steps < this.home_steps) {
            console.log(`${this.name} homed`);
            this.delay = 1;
            this.pos = 0;
            this.homing = false;
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
            this.delay = 5;
            console.log(`${this.name} starting to home (-${this.home_steps})`);
            this.move(-this.home_steps)
                .then(steps => this._finish_home(steps));
        }
    }

}

const pan = new Motor('Pan', {
    step: 27, dir: 22, enable: 17, limit: 23,
    min: 4 * 16, max: 122 * 16, home_direction: true, home_steps: 200 * 16,
});

const tilt = new Motor('Tilt', {
    step: 3, dir: 4, enable: 2, limit: 24,
    min: 16, max: 46 * 16, home_direction: false, home_steps: 60 * 16,
});

console.log("Starting...");

pan.ctl.enabled = false;
tilt.ctl.enabled = false;

// pan.start_home();
// tilt.start_home();

process.on('SIGINT', function() {
    console.log("Caught interrupt signal");
    // pan.ctl.enabled = false;
    // tilt.ctl.enabled = false;
    process.exit();
});


