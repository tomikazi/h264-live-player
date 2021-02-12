"use strict";

const util      = require('util');
const spawn     = require('child_process').spawn;
const merge     = require('mout/object/merge');

const Server    = require('./_server');


class RpiServer extends Server {

  constructor(server, opts) {
    super(server, merge({
      fps : 30
    }, opts));
  }

  get_feed() {
    var msk = "raspivid -t 0 -o - -w %d -h %d -fps %d";
    var cmd = util.format(msk, this.options.width, this.options.height, this.options.fps);
    console.log(cmd);
    this.streamer = spawn('raspivid', ['-t', '0', '-o', '-', '-w', this.options.width, '-h', this.options.height, '-fps', this.options.fps, '-pf', 'baseline']);
    this.streamer.on("exit", function (code) {
      if (code)
        console.log("raspivid failure", code);
    });
    return this.streamer.stdout;
  }

  stop_feed() {
    if (this.streamer) {
      this.streamer.stdout.pause();
      this.streamer.kill(9);
    }
    this.streamer = null;
    spawn('killall', ['raspivid']);
    super.stop_feed();
  }

}

module.exports = RpiServer;
