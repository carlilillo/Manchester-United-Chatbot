import { productMarkdown } from '../utils/product-content';
import { ScrapeSession } from '../utils/scrape-session';
import { links, SHOP } from '../utils/source-links';

/** Use category pages only for discovery; the archive contains product documents only. */
export async function scrapeStore(session: ScrapeSession): Promise<void> {
  const sections = [
    ...['home', 'away', 'third'].flatMap((kit) =>
      ['mens', 'womens'].map((gender) => `kit/${kit}/${gender}`),
    ),
    ...['mens', 'womens'].flatMap((gender) =>
      ['tops', 'jackets-coats', 'trousers-shorts'].map((kind) => `trainingwear/${gender}/${kind}`),
    ),
  ];
  const products = new Set<string>();
  for (const section of sections) {
    const source = `${SHOP}/en-gb/c/${section}`;
    try {
      const html = await session.html(source, 'store/products/ (discovery only)');
      const urls = links(html, SHOP, (url) => url.origin === SHOP && /\/p\//.test(url.pathname));
      urls.forEach((url) => products.add(url));
      session.logger.log(`Discovered ${urls.length} product URLs from ${source}`);
      if (!urls.length) session.reportError(`${source}: No product links found`);
    } catch (error) {
      session.reportError(`${source}: ${String(error)}`);
    }
  }
  await session.details([...products], 'store/products', 'store', productMarkdown);
}
