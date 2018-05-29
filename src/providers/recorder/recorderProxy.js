export default class RecorderProxy {
    constructor(recorders) {
        /// TODO: ensure these are an array of recorder objects.
        this.recorders = recorders;
    }

    async initialise(message, logger) {
        for (let i = 0; i < this.recorders.length; i++) {
            const recorder = this.recorders[i];
            if (recorder.initialise)
                await recorder.initialise(message, logger);
        }
    }

    async close() {
        for (let i = 0; i < this.recorders.length; i++) {
            const recorder = this.recorders[i];
            if (recorder.close)
                await recorder.close();
        }
    }

    async setHeader(message, logger) {
        for (let i = 0; i < this.recorders.length; i++) {
            const recorder = this.recorders[i];
            if (recorder.setHeader)
                await recorder.setHeader(message, logger);
        }
    }

    async setFooter(message, logger) {
        for (let i = 0; i < this.recorders.length; i++) {
            const recorder = this.recorders[i];
            if (recorder.setFooter)
                await recorder.setFooter(message, logger);
        }
    }

    async finalise(message, logger) {
        for (let i = 0; i < this.recorders.length; i++) {
            const recorder = this.recorders[i];
            if (recorder.finalise)
                await recorder.finalise(message, logger);
        }
    }
}