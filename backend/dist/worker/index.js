"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = void 0;
const publisher_1 = require("./publisher");
const startWorker = () => {
    const worker = new publisher_1.PublisherWorker();
    // Start em background
    worker.start().catch(console.error);
    // Tratamento de encerramento
    process.on('SIGTERM', () => worker.stop());
    process.on('SIGINT', () => worker.stop());
    return worker;
};
exports.startWorker = startWorker;
