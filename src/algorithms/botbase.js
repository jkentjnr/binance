export default class BotBase {

    static addBotSchema(v, schema) {
        // Take no action - effectively abstract.
    }

    static validateData(message, dataProvider) {
        return [];
    }
}
