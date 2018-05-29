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
        if (recorder) {
            await recorder.setHeader(message, log);    
        }
    }

	async setFooter(message, log) {
        const recorder = await this.getRecorder(message, log);
        if (recorder) {
            await recorder.setFooter(message, log);    
        }
    }

	async finalise(message, log) {
        const recorder = await this.getRecorder(message, log);
        if (recorder) {
            await recorder.finalise(message, log);    
        }
    }

	async close(message, log) {
        const recorder = await this.getRecorder(message, log);
        if (recorder) {
            await recorder.close(message);
        }
    }
    
}

export default new Recorder();