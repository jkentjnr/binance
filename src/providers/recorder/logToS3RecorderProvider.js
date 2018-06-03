import RecorderBase from './recorderBase';
import s3Helper from '../../utils/s3Helper';
import set from 'lodash.set';

import Convert from 'ansi-to-html';
const convertHtml = new Convert();

class LogToS3RecorderProvider extends RecorderBase {

    constructor() {
        super();
    }

    async finalise(message, log) {
        if (message.console) {
            const htmlString = message.console.map(row => { console.log('row', row); return (`<p>${convertHtml.toHtml(row)}</p>`); }).join('');
            const htmlLog = `<html><head><style>body{background-color: black;font-family: monospace;white-space: pre;}p{margin:0;}</style><body>${htmlString}</body></html>`;
            //console.log('html', htmlLog);

            const folderPath = (process.env.S3_PATH) ? `${process.env.S3_PATH}/${message.name}/` : `${message.name}/`;
            const filePath = `${folderPath}${message.name}.html`;

            await s3Helper.saveFile(filePath, htmlLog, 'text/html');

            set(message, 'response.html', `${process.env.S3_URL}${filePath}`);
        }
    }

}

const provider = new LogToS3RecorderProvider();
export default provider;