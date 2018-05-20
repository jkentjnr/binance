export default class BotBase {

    async addBotSchema(v, schema) {
        // Take no action - effectively abstract.
    }

    async validateData(message, dataProvider) {
        return [];
    }

    async setDefaults(message) {
        return message;
    }
}
