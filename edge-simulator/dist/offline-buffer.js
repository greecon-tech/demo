"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineBuffer = void 0;
class OfflineBuffer {
    items = [];
    append(item) {
        this.items.push(item);
    }
    size() {
        return this.items.length;
    }
    snapshot() {
        return [...this.items];
    }
    async flush(dispatch) {
        let sent = 0;
        const retained = [];
        for (const item of this.items) {
            try {
                await dispatch(item);
                sent += 1;
            }
            catch {
                retained.push(item);
            }
        }
        this.items.length = 0;
        this.items.push(...retained);
        return {
            sent,
            retained: retained.length
        };
    }
}
exports.OfflineBuffer = OfflineBuffer;
//# sourceMappingURL=offline-buffer.js.map