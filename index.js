const chromeLauncher = require("chrome-launcher")
const puppeteer = require('puppeteer')
const fs = require('fs')
const { join, resolve } = require("path")
const axios = require("axios")
const probe = require("probe-image-size")


async function downloadImage({ url, path, imageName }) {

  const writePath = resolve(join(path, imageName))
  const writer = fs.createWriteStream(writePath)
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve
    )
    writer.on('error', reject)
  })
}
img = []
// async function run() {
//   const browser = await puppeteer.launch({ headless: false, handleSIGINT: false, args: ["--disable-gpu", "--window-size=400,600", "--no-sandbox"] });
//   const ImagesOk = {};
//   let index = 0;
//   for (site of sites) {
//     let imgSelector;

//     Object.keys(SELECTORS).forEach((each, index) => {
//       const regExp = new RegExp(each, "gi")
//       if (regExp.test(site)) {
//         imgSelector = SELECTORS[each]
//       }
//     })
//     const page = await browser.newPage()
//     await page.setViewport({ width: 400, height: 600 })
//     await page.goto(site, { waitUntil: "load" })
//     let imageHref = await page.evaluate(sel => {
//       try {
//         return document.querySelector(sel).getAttribute('src')
//       }
//       catch (erro) {
//         console.log(erro)
//       }
//     }, imgSelector)
//     if (imageHref) img.push(imageHref)
//     ImagesOk[`site-${index}`] = { status: imgSelector ? 'ok' : "ERRO", img: imageHref ? imageHref : "erro", site }
//     index++;
//     console.clear()
//     console.log(ImagesOk)
//   }
//   console.log("ended");
// }

// run()

const dir = "./items"
const checkInternet = () => {
  require('dns').resolve("www.google.com", (err) => {
    if (err) {
      throw new Error("No connection")
    } else {
      console.log("Connected");
    }
  })
}
const productListSelector = '.products.list.items.product-items'
const miraoSite = "https://www.mirao.com.br/perifericos.html"
async function run() {
  try {
    checkInternet()
    const browser = await puppeteer.launch({ headless: false, handleSIGINT: false, args: ["--disable-gpu", "--window-size=900,900", "--no-sandbox"] });
    let imgSelector;
    const page = await browser.newPage()
    await page.setViewport({ width: 900, height: 900 })
    await page.goto(miraoSite, { waitUntil: "load" })

    await page.waitForSelector(".item.product.product-item")
    const products = await page.$$eval(".product-item-info", items => {
      const obj = items.map(item => {
        const text = item.querySelector(".product-item-link").textContent
        const link = item.querySelector(".product-item-link").href
        const billPrice = item.querySelector("#price-discount-billet").querySelector(".price").textContent
        const oldPrice = item.querySelector(".price").textContent
        return { text, link, billPrice, oldPrice }
      })

      return obj
    })
    let newProducts = []
    for (product of products) {
      await page.goto(product.link)
      const link = [];

      try {
        await page.waitForSelector(".fotorama__nav__shaft img", { timeout: 300 })
        const links = []
        const length = await page.$$eval(".fotorama__nav__shaft img", items =>
          items.length
        )

        const dd = await page.$('.fotorama__arr.fotorama__arr--next')

        for (i = 0; i < length - 1; i++) {
          await page.waitForTimeout(500)
          // await page.waitForSelector("#notice-cookie-block")

          const xx = await page.$$eval(".fotorama__img", (items) => {
            return items.map(item => item.src)
          })
          xx.map(async (url) => {
            let result = await probe(url)
            if (result.width > 100) {
              link.push(url)
            }

          })
          await dd.click()
        }
        product.images = Array.from(new Set(link))
        newProducts.push(product)
      } catch (err) {
        console.log("ERROR | one product", err)
        await page.waitForTimeout(300)

        await page.waitForSelector(".fotorama__img")
        const xx = await page.$eval(".fotorama__img", (item) => {

          return item.src
        })
        link.push(xx)
        product.images = link
        newProducts.push(product)

      }

    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    console.log("Ended")
    console.log(newProducts)
    newProducts.forEach((product, index) => {
      const FOLDER_NAME = product.text.split(" ").join("~")
      console.log(FOLDER_NAME);
      try {
        if (!fs.existsSync(join(dir, FOLDER_NAME))) {
          fs.mkdirSync(join(dir, FOLDER_NAME))
        }
        product.images.forEach((url) => {
          const imageName = url.replace(/^.+\//, "").replace(/\..*$/, "")
          const date = new Date().toISOString().replace(/[\W\D]/gi, "")
          const format = url.replace(/^.+\./, "")
          const newImageName = `${imageName}-${date}.${format}`
          downloadImage({ url, imageName: newImageName, path: join(dir, FOLDER_NAME) })

        })

      } catch (error) {
        const date = new Date().toISOString().replace(/[\W\D]/gi, "")
        fs.writeFileSync(join(dir, `ERROR-${date}.txt`), `Error Index: ${index}\nProduct:\n\tnome: ${product.text}\n\tlink: ${product.link}\n\tpreço avista: ${product.billPrice}\n\tpreço à prazo: ${product.oldPrice} \n${error}`)
      }
    })
    console.log("ended");
  } catch (error) {
    console.error(error)
  }
}

run()
