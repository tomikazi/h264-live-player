

"use strict";

const Gpio = require('pigpio').Gpio;

let limit1 = new Gpio(18, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    alert: true
});

// limit1.glitchFilter(1000);

limit1.on('alert', (level, tick) => {
    console.log(`limit1: ${level}`);
});


let limit2 = new Gpio(15, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    alert: true
});

// limit2.glitchFilter(1000);

limit2.on('alert', (level, tick) => {
    console.log(`limit2: ${level}`);
});
