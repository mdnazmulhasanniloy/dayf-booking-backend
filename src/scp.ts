import puppeteer from 'puppeteer';

interface Product {
  title: string | null;
  price: string | null;
  description: string | null;
  image: string | null;
}

const getUrlData = async (url: string): Promise<Product> => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  // Extract data from Amazon product page
  const product: Product = await page.evaluate(() => {
    const title =
      document.querySelector('#productTitle')?.textContent?.trim() ||
      document.querySelector('.page-title')?.textContent?.trim() ||
      document.querySelector('h1.-fs20.-pts.-pbxs')?.textContent?.trim() ||
      null;

    const price =
      document.querySelector('#priceblock_ourprice')?.textContent?.trim() ||
      document.querySelector('#priceblock_dealprice')?.textContent?.trim() ||
      document.querySelector('.a-price .a-offscreen')?.textContent?.trim() ||
      document.querySelector('.product-new-price')?.textContent?.trim() ||
      document
        .querySelector('.-b.-ubpt.-tal.-fs24.-prxs')
        ?.textContent?.trim() ||
      null;

    const description =
      Array.from(document.querySelectorAll('#feature-bullets ul li span'))
        .map(el => el.textContent?.trim())
        .join(' | ') ||
      document
        .querySelector('.product-highlight.panel-benefits')
        ?.textContent?.trim()
        .split('\n')
        .join(' ') ||
      document
        .querySelector('.markup.-mhm.-pvl.-oxa.-sc')
        ?.textContent?.trim()
        .split('\n')
        .join(' ') ||
      null;

    const image =
      (document.querySelector('#landingImage') as HTMLImageElement)?.src ||
      (
        document.querySelector('#imgTagWrapperId img') as HTMLImageElement
      )?.getAttribute('data-old-hires') ||
      (document.querySelector('img.bg-onaccent') as HTMLImageElement)?.src ||
      (document.querySelector('img.-fh.-fw') as HTMLImageElement)?.getAttribute(
        'data-src',
      ) ||
      (document.querySelector('img.-fh.-fw') as HTMLImageElement)?.src ||
      null;

    return { title, price, description, image };
  });

  await browser.close();

  return product;
};

export default getUrlData;
