import providerFactory from '../providers';

class Recorder {

    constructor() {
        this.recorders = null;
    }

    async getRecorder(message, log) {
        if (this.recorders === null) {
            this.recorders = await providerFactory.getRecorderProvider(message, log);
        }
        return this.recorders;
    }

	async setHeader(message, log) {
        const recorder = await this.getRecorder(message, log);
        recorder.setHeader(message, log);
    }
}

export default new Recorder();