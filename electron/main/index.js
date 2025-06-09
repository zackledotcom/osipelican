"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const memoryHandlers_1 = require("./ipc/memoryHandlers");
electron_1.app.whenReady().then(() => {
    (0, memoryHandlers_1.setupMemoryHandlers)();
});
//# sourceMappingURL=index.js.map