import { load } from 'cheerio';
import { clean } from '../utils/next-data';
import { absoluteUrl, CLUB, markdownText, markdownUrl } from '../utils/source-links';

export type Person = { name: string; source: string; image?: string; number?: string; position?: string; role?: string };
export type PeopleGroup = 'men' | 'women' | 'staff';

/** Read only roster cards; navigation and related articles cannot become profiles. */
export function peopleItems(html: string, source: string, group: PeopleGroup): Person[] {
  const $ = load(html);
  const people = new Map<string, Person>();
  const selector = group === 'staff' ? 'a[class*="gatewayCard_link"]' : '[data-testid="profile-card"]';
  $(selector).each((_index, element) => {
    const card = $(element);
    const href = absoluteUrl(group === 'staff' ? card.attr('href') : card.find('a[href]').first().attr('href'), source);
    if (!href || new URL(href).origin !== CLUB || !new URL(href).pathname.startsWith(new URL(source).pathname + '/')) return;
    const field = (name: string) => clean(card.find(`[data-testid="${name}"]`).first().text());
    const name = group === 'staff' ? clean(card.find('h2,h3,h4,h5').first().text())
      : field('profile-card__known-as') || [field('profile-card__first-name'), field('profile-card__last-name')].filter(Boolean).join(' ');
    if (!name) return;
    people.set(href, {
      name, source: href, image: absoluteUrl(card.find('img').first().attr('src'), source),
      ...(group === 'staff' ? { role: field('gateway-card__sub-title') } : {
        number: field('profile-card__squad-number'),
        position: clean(card.closest('[class*="profileListings_profileListings"]').find('h2').first().text()) || 'Players',
      }),
    });
  });
  return [...people.values()];
}

/** Render each person once, with players grouped under the club's position headings. */
export function peopleListingMarkdown(people: Person[], group: PeopleGroup): string {
  if (!people.length) throw new Error(`No ${group} profile cards found`);
  const sections = new Map<string, Person[]>();
  for (const person of people) {
    const heading = group === 'staff' ? 'Coaching staff' : person.position || 'Players';
    if (!sections.has(heading)) sections.set(heading, []);
    sections.get(heading)!.push(person);
  }
  const title = group === 'staff' ? 'Head coach and staff' : `${group === 'men' ? "Men's" : "Women's"} team`;
  return `# ${title}\n\n` + [...sections].map(([heading, members]) => `## ${markdownText(heading)}\n\n` + members.map(person => [
    `### ${markdownText(person.name)}`,
    ...(person.number ? [`- Number: ${markdownText(person.number)}`] : []),
    ...(person.role ? [`- Role: ${markdownText(person.role)}`] : []),
    `- Profile: [Official profile](${markdownUrl(person.source)})`,
    ...(person.image ? [`- Image: [Image](${markdownUrl(person.image)})`] : []),
  ].join('\n')).join('\n\n')).join('\n\n');
}

/** Extract biography and bio cards from dedicated containers, excluding related content entirely. */
export function profileMarkdown(html: string, person: Person, group: PeopleGroup): string {
  const $ = load(html);
  const hero = $('[data-testid="profile-hero"]').first();
  const facts = new Map<string, string>();
  const addFact = (label: string, value: string | undefined) => { if (value?.trim()) facts.set(label, clean(value)); };
  const field = (name: string) => clean(hero.find(`[data-testid="profile-hero__${name}"]`).first().text());
  addFact('Number', field('squad-number') || person.number);
  addFact('Position', field('position') || person.position);
  addFact('Role', person.role);
  addFact('Country', hero.find('[class*="profileHero_countryName"]').first().text());
  addFact('Age', field('age'));
  $('[data-testid^="key-bio-highlights__stat--"]').each((_index, element) => {
    const card = $(element);
    const label = clean(card.find('[data-testid="basic-stat-title"]').text());
    if (label) addFact(label, card.find('[data-testid="basic-stat-information"]').text());
  });

  // Staff pages use editorial text blocks; player biographies have their own container.
  const biography = group === 'staff'
    ? $('main [class*="v3-textBlock-module__content"]')
    : $('[class*="profileBio_content"]');
  const paragraphs = new Set<string>();
  biography.find('p,li').each((_index, element) => {
    const value = clean($(element).text());
    if (value) paragraphs.add(value);
  });
  if (!paragraphs.size) throw new Error(`No biography found at ${person.source}`);
  const image = absoluteUrl(hero.find('[data-testid="profile-hero__profile-image"] img').first().attr('src'), person.source) || person.image;
  return [
    `# ${markdownText(person.name)}`,
    [...facts].map(([label, value]) => `- ${markdownText(label)}: ${markdownText(value)}`).join('\n'),
    ...(image ? [`- Image: [Image](${markdownUrl(image)})`] : []),
    '## Biography', ...[...paragraphs].map(markdownText),
  ].filter(Boolean).join('\n\n');
}
