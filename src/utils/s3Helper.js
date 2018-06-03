import AWS from 'aws-sdk';
const s3 = new AWS.S3();

export default class S3Helper {
    static saveFile(filename, data, contentType = 'application/json') {
        const params = {
            Bucket: process.env.S3_BUCKET, 
            Key: filename,
            ContentType: contentType,
            Body: (contentType === 'application/json') ? JSON.stringify(data, null, 2) : data
        };

        return new Promise((resolve, reject) => {
            s3.putObject(params, function(err, fileStream) {
                if (err) { reject(err); return; }
                //const fileData = fileStream.Body.toString('utf8');
                console.log('data', data);
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