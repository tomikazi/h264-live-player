var ws281x = require('rpi-ws281x');
 
class Light {
 
    constructor() {
        this.config = {leds:13, brightness:96, type:'grb', gpio:21};
        ws281x.configure(this.config);
        this.pixels = new Uint32Array(this.config.leds);
        this.color = 0xffffff;
    }

    off() {
        console.log('Light off');
        this.fill(0);
        ws281x.render(this.pixels);
    }

    on() {
        console.log('Light on');
        this.fill(this.color);
        ws281x.render(this.pixels);
    }

    set_color(c) {
        this.color = c;
        this.fill(c);
        ws281x.render(this.pixels);
    }

    fill(c) {
        for (let i = 0; i < this.pixels.length; i++) {
            this.pixels[i] = c;
        }
    }
 
}

module.exports = Light