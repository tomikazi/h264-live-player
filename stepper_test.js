"use strict";

const Motor = require('./stepper');

const pan = new Motor('Pan', {
    step: 27, dir: 22, enable: 17, limit: -23,
    min: 4 * 16, max: 122 * 16, home_direction: true, home_steps: 200 * 16,
});

const tilt = new Motor('Tilt', {
    step: 3, dir: 4, enable: 2, limit: -24,
    min: 16, max: 46 * 16, home_direction: false, home_steps: 60 * 16,
});

console.log("Starting...");

pan.set_home()
tilt.set_home()

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sequence() {
    tilt.move_to(10 * 16, 10);
    await pan.move_to(100 * 16);
    tilt.move_to(5 * 16, 10);
    await pan.move_to(50 * 16);
    tilt.move(5 * 16, 10);
    await pan.move(50 * 16);
    tilt.move_to(0 * 16, 10);
    await pan.move_to(0 * 16);
}

sequence();

process.on('SIGINT', function () {
    console.log("Caught interrupt signal");
    pan.ctl.enabled = false;
    tilt.ctl.enabled = false;
    process.exit();
});


