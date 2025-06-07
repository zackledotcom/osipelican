"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestQueue = void 0;
class RequestQueue {
    constructor(delayFn) {
        this.delayFn = delayFn;
        this.queue = [];
        this.isProcessing = false;
    }
    enqueue(requestItem) {
        this.queue.push(requestItem);
        this.process();
    }
    async process() {
        if (this.isProcessing || !this.queue.length)
            return;
        this.isProcessing = true;
        const item = this.queue[0];
        try {
            const result = await item.request();
            item.resolve(result);
        }
        catch (err) {
            if (item.retries < item.maxRetries) {
                item.retries++;
                await this.delayFn(2 ** item.retries * 1000);
                this.isProcessing = false;
                return this.process();
            }
            item.reject(err);
        }
        this.queue.shift();
        this.isProcessing = false;
        this.process();
    }
    clear() {
        this.queue = [];
        this.isProcessing = false;
    }
    get length() {
        return this.queue.length;
    }
    get isActive() {
        return this.isProcessing;
    }
}
exports.RequestQueue = RequestQueue;
//# sourceMappingURL=RequestQueue.js.map