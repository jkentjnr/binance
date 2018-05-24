import AWS from 'aws-sdk';
const s3 = new AWS.S3();

export default class S3Helper {
    static saveFile(filename, data) {
        const params = {
            Bucket: process.env.S3_BUCKET, 
            Key: filename,
            Body: JSON.stringify(data, null, 2)
        };

        return new Promise((resolve, reject) => {
            s3.putObject(params, function(err, fileStream) {
                if (err) { reject(err); return; }
                //const fileData = fileStream.Body.toString('utf8');
                resolve(data);
            });
        });
    }

    static getFile(filename, data) {
        const params = {
            Bucket: process.env.S3_BUCKET, 
            Key: filename
        };

        return new Promise((resolve, reject) => {
            s3.getObject(params, function(err, fileStream) {
                if (err) { reject(err); return; }
                const fileData = fileStream.Body.toString('utf8');
                resolve(fileData);
            });
        });
    }
}