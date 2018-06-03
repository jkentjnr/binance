import RecorderBase from './recorderBase';
import s3Helper from '../../utils/s3Helper';
import set from 'lodash.set';

import { Parser as Json2csvParser } from 'json2csv';

class CsvToS3RecorderProvider extends RecorderBase {

    constructor() {
        super();
    }

    async finalise(message, log) {
        const csvOutput = new Json2csvParser().parse(message.log);
        //console.log('csv', csvOutput);

        const folderPath = (process.env.S3_PATH) ? `${process.env.S3_PATH}/${message.name}/` : `${message.name}/`;
        const filePath = `${folderPath}${message.name}.csv`;

        await s3Helper.saveFile(filePath, csvOutput, 'text/csv');

        set(message, 'response.csv', `${process.env.S3_URL}${filePath}`);
    }

}

const provider = new CsvToS3RecorderProvider();
export default provider;