import { batches } from '../../utils/batches';
import { peopleItems, peopleListingMarkdown, Person, PeopleGroup, profileMarkdown } from '../people/profile-content';
import { fetchPlayerStatistics } from '../people/player-statistics';
import { ScrapeSession } from '../utils/scrape-session';
import { CLUB, uniqueNameFor } from '../utils/source-links';

/** Save a complete biography with optional live statistics under a stable filename. */
export async function scrapePerson(session: ScrapeSession, person: Person, group: PeopleGroup): Promise<void> {
  const path = `people/${group}/${uniqueNameFor(person.source)}.md`;
  try {
    const html = await session.html(person.source, path);
    const biography = profileMarkdown(html, person, group);
    const statistics = group === 'staff' ? '' : await fetchPlayerStatistics(session, html, path);
    session.add(person.source, path, 'people', [biography, statistics].filter(Boolean).join('\n\n'));
  } catch (error) { session.reportError(`${person.source}: ${String(error)}`); }
}

/** Capture roster/staff cards and follow only their profiles, with bounded request concurrency. */
export async function scrapePeople(session: ScrapeSession): Promise<void> {
  const groups: [PeopleGroup, string][] = [
    ['men', `${CLUB}/en/teams/mens-team`], ['women', `${CLUB}/en/teams/womens-team`],
    ['staff', `${CLUB}/en/man-utd-head-coach-and-staff`],
  ];
  for (const [group, source] of groups) {
    try {
      const path = `people/${group}.md`;
      const people = peopleItems(await session.html(source, path), source, group);
      session.add(source, path, 'people', peopleListingMarkdown(people, group));
      for (const batch of batches(people, 2)) await Promise.all(batch.map(person => scrapePerson(session, person, group)));
    } catch (error) { session.reportError(`${source}: ${String(error)}`); }
  }
}
