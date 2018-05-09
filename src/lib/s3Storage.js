import AWS from 'aws-sdk';
const s3 = new AWS.S3();

class S3Storage {

    write(bucket, filename, data, options) {
        const params = {
            Bucket: bucket, 
            Key: filename,
            Body: data
        };

        return new Promise((resolve, reject) => {
            s3.putObject(params, (err, result) => {
                if (err) { 
                    reject(new Error('Could not log to S3.', err)); 
                    return;
                }
                
                //resolve(`https://s3.${options.region}.amazonaws.com/${bucket}/${filename}`);
                resolve(`http://${bucket}.s3-website.${options.region}.amazonaws.com/${filename}`);
            });
        });
    }
}

const obj = new S3Storage();
export default obj;