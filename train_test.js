"use strict";

const TrainTracker = require('./lib/train');
const secret = require('./secret');

const train = new TrainTracker({
    mqttIp: secret.mqttIp,
    mqttUser: secret.mqttUser,
    mqttPass: secret.mqttPass,
});

console.log("Starting...");

process.on('SIGINT', function () {
    console.log("Caught interrupt signal");
    train.stop_tracking();
    process.exit();
});


