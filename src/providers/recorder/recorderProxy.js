export default class RecorderProxy {
    constructor(recorders) {
        /// TODO: ensure these are an array of recorder objects.
        this.recorders = recorders;
    }

    async initialise(message, logger) {
        for (let i = 0; i < this.recorders.length; i++) {
            const recorder = this.recorders[i];
            await recorder.initialise(message, logger);
        }
    }

    async close() {
        for (let i = 0; i < this.recorders.length; i++) {
            const recorder = this.recorders[i];
            await recorder.close();
        }
    }

    async setHeader(message, logger) {
        for (let i = 0; i < this.recorders.length; i++) {
            const recorder = this.recorders[i];
            await recorder.setHeader(message, logger);
        }
    }
}