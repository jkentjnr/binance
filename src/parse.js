import zlib from 'zlib';
import fs from 'fs';
import path from 'path';

import gunzip from 'gunzip-file';

const csvPath = '/home/jkentjnr/Downloads/datatype-timeseries-date/ohlcv_active_consolidated/';
const dirs = p => fs.readdirSync(p).filter(f => fs.statSync(path.join(p, f)).isDirectory());
const files = p => fs.readdirSync(p).filter(f => fs.statSync(path.join(p, f)).isFile());

const process = (source, destination) => new Promise((resolve, reject) => {
  gunzip(source, destination, () => {
    console.log('gunzip done:', destination, source);
    resolve();
  });
});

(async () => {

  const childFolders = dirs(csvPath);
  for(let i = 0; i < childFolders.length; i++) {
    const durationFolderName = childFolders[i];
    const filesArray = files(path.join(csvPath, durationFolderName));

    for (let j = 0; j < filesArray.length; j++) {
      const dataFileName = filesArray[j];

      const sourceFile = path.join(csvPath, durationFolderName, dataFileName);

      const targetFileName = `${durationFolderName}_${dataFileName.replace('.gz', '')}`;
      const target = path.join(__dirname, '../data', targetFileName);

      console.log(sourceFile, target);

      await process(sourceFile, target);
    }
  }

})();

/*

var fs = require('fs');
var zlib = require('zlib');

var gunzip = zlib.createGunzip();
var rstream = fs.createReadStream('myfile.txt.gz');

rstream   // reads from myfile.txt.gz
  .pipe(gunzip)  // uncompresses
  .pipe(process.stdout);  // writes to stdout
*/