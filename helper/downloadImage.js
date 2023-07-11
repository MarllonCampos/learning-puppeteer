const fs = require('fs');
const axios = require('axios');
const { join, resolve } = require('path');

async function downloadImage({ url, path, imageName }) {
  const writePath = resolve(join(path, imageName));
  const writer = fs.createWriteStream(writePath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve);
    writer.on('error', reject);
  });
}

module.exports = { downloadImage };
