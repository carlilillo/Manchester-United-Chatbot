import { load } from 'cheerio';
import { htmlToMarkdown } from './html-to-markdown';

/** Remove responsive recommendation duplicates before converting the product's main content. */
export function productMarkdown(html: string, source: string): string {
  const $ = load(html);
  const looks = $('main section[id="get-the-look"], main [data-test-id="cross-selling-section"]');
  // The first section is the desktop version; the later mobile copy repeats its products.
  looks.slice(1).remove();
  looks.first().find('h2').first().text('Complete the Look');

  $('main h2')
    .filter((_index, heading) => $(heading).text().trim().toLowerCase() === 'you may also like')
    .each((_index, heading) => {
      const title = $(heading);
      const section = title.closest('.product-carousel, section');
      if (section.length) section.remove();
      else title.remove();
    });
  // Use the cleaned DOM only; embedded payloads must not restore removed recommendations.
  $('script').remove();
  return htmlToMarkdown($.html(), source);
}
