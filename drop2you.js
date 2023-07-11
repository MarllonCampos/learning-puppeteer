const chromeLauncher = require('chrome-launcher');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { join, resolve } = require('path');
const axios = require('axios');
const probe = require('probe-image-size');
const { checkInternet } = require('./helper/checkInternet');
const { downloadImage } = require('./helper/downloadImage');

const dir = './drop2you';
const dropToYouSite = 'https://drop2you.meucatalogodigital.com/categoria/65023/pet/';
const category = dropToYouSite.split('/')[dropToYouSite.split('/').length - 2];
const productListSelector = '.listagem-produtos';
const productSelector = `${productListSelector} .box-produto`;

const photosContainer = '#owl-fotos';

async function run() {
  try {
    checkInternet();
    const browser = await puppeteer.launch({
      headless: false,
      handleSIGINT: false,
      args: ['--disable-gpu', '--window-size=900,900', '--no-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 900 });
    await page.goto(dropToYouSite, { waitUntil: 'load' });
    await page.waitForSelector(productSelector);
    const products = await page.$$eval(productSelector, (items) => {
      const obj = items.map((item) => {
        const productName = item.querySelector('h3').textContent.replace(/[\t\n]/gi, '');
        const link = item.querySelector('a').href;
        const price = item.querySelector('.valor');
        const oldPrice = price.querySelector('del').textContent.replace('R$', '').trim();
        const billPrice = price.textContent.split('por')[1].replace(/[^0-9,.]/g, '');
        return { text: productName, link, billPrice, oldPrice };
      });

      return obj;
    });
    let newProducts = [];
    for (product of products) {
      await page.goto(product.link);
      await page.waitForSelector(photosContainer);
      const links = await page.$$eval(`${photosContainer} img`, (items) => {
        return items.map((item) => item.src);
      });

      product.images = Array.from(new Set(links));
      newProducts.push(product);
    }

    let erros = 0;
    newProducts.forEach((product, index) => {
      const FOLDER_NAME = product.text.replace(/\//g, '-').split(' ').join('~');
      const finalPath = join(dir, category, FOLDER_NAME);
      try {
        if (!fs.existsSync(finalPath)) {
          fs.mkdirSync(finalPath, { recursive: true });
        }
        product.images.forEach((url) => {
          const imageName = url.replace(/^.+\//, '').replace(/\..*$/, '');
          const date = new Date().toISOString().replace(/[\W\D]/gi, '');
          const format = url.replace(/^.+\./, '');
          const newImageName = `${imageName}-${date}.${format}`;
          downloadImage({ url, imageName: newImageName, path: finalPath });
        });
        fs.writeFileSync(join(finalPath, `valores.txt`), `avista: ${product.billPrice}\nprazo: ${product.oldPrice}`);
      } catch (error) {
        const date = new Date().toISOString().replace(/[\W\D]/gi, '');
        fs.writeFileSync(
          join(dir, `ERROR-${date}.txt`),
          `Error Index: ${index}\nProduct:\n\tnome: ${product.text}\n\tlink: ${product.link}\n\tpreço avista: ${product.billPrice}\n\tpreço à prazo: ${product.oldPrice} \n${error}`
        );
        console.log('Houve error');
        erros++;
      }
    });
    console.log(`Total: ${newProducts.length}\nErros: ${erros}`);
  } catch (error) {
    console.error('Error - ', error);
  }
}

run();
