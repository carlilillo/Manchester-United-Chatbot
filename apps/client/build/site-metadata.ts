import type { Plugin } from 'vite';

const CREST_PATH = '/manchester-united-crest.png';

/** Accepts only a public root URL: this client serves its assets and API at /. */
export function parseSiteUrl(value: string | undefined): URL | null {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'SITE_URL must be an HTTP(S) origin without a path, credentials, query, or fragment.',
    );
  }
  return url;
}

/** Writes absolute sharing URLs into HTML so crawlers do not need to run React. */
export function siteMetadata(siteUrl: URL | null) {
  return {
    name: 'united-chat-site-metadata',
    buildStart() {
      if (!siteUrl) {
        this.warn(
          'Set SITE_URL before publishing to enable canonical and absolute social-image URLs.',
        );
      }
    },
    transformIndexHtml(html) {
      const imageUrl = siteUrl ? new URL(CREST_PATH, siteUrl).href : CREST_PATH;
      return {
        html: html.replaceAll('__SOCIAL_IMAGE_URL__', imageUrl),
        tags: siteUrl
          ? [
              { tag: 'link', attrs: { rel: 'canonical', href: siteUrl.href }, injectTo: 'head' },
              {
                tag: 'meta',
                attrs: { property: 'og:url', content: siteUrl.href },
                injectTo: 'head',
              },
            ]
          : [],
      };
    },
  } satisfies Plugin;
}
