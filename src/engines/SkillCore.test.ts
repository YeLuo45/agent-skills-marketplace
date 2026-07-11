// V1-V10: Agent Skills Marketplace Core Batch 1/3 tests
import { describe, it, expect } from 'vitest';
import {
  SkillRegistry,
  SkillMetadata,
  SkillSearch,
  SkillRecommender,
  SkillInstaller,
  SkillVerifier,
  SkillVersioner,
  SkillDependencyResolver,
  SkillCategorizer,
  SkillManifestValidator,
  SkillMarketplaceCoreIndex,
  SKM_BATCH_1_ENGINES,
  type SkillMeta,
} from './SkillCore';

const seed = (reg: SkillRegistry): void => {
  const skills: SkillMeta[] = [
    {
      id: 'web-search',
      name: 'Web Search',
      version: '1.2.0',
      author: 'YeLuo45',
      description: 'Search the web with multiple providers and citations.',
      tags: ['search', 'web', 'research', 'mcp'],
      category: 'research',
      pulled: 12500,
      ratingSum: 47,
      ratingCount: 12,
    },
    {
      id: 'code-review',
      name: 'Code Review',
      version: '2.0.1',
      author: 'obra',
      description: 'Production-grade code review skill for AI coding agents.',
      tags: ['code', 'review', 'test', 'lint', 'agent'],
      category: 'development',
      pulled: 9800,
      ratingSum: 39,
      ratingCount: 10,
    },
    {
      id: 'memory-store',
      name: 'Long-term Memory',
      version: '0.9.0',
      author: 'TencentCloud',
      description: 'Long-term memory for AI agents via Postgres.',
      tags: ['memory', 'agent', 'postgres', 'rag'],
      category: 'meta',
      pulled: 8800,
      ratingSum: 42,
      ratingCount: 11,
    },
    {
      id: 'pentest',
      name: 'Pen Test',
      version: '1.0.0',
      author: 'strix',
      description: 'Open-source AI penetration testing tool.',
      tags: ['security', 'penetration', 'vulnerability', 'pentest'],
      category: 'security',
      pulled: 5100,
      ratingSum: 25,
      ratingCount: 7,
    },
  ];
  for (const s of skills) reg.register(s);
};

describe('SkillRegistry + SkillMetadata', () => {
  it('register + get + has + remove + all + size + names', () => {
    const r = new SkillRegistry();
    seed(r);
    expect(r.size()).toBe(4);
    expect(r.has('web-search')).toBe(true);
    expect(r.get('web-search')?.name).toBe('Web Search');
    expect(r.get('missing')).toBeNull();
    expect(r.names().length).toBe(4);
    expect(r.all().length).toBe(4);
    expect(r.remove('web-search')).toBe(true);
    expect(r.remove('missing')).toBe(false);
    expect(r.size()).toBe(3);
  });

  it('SkillMetadata normalize + toLine', () => {
    const m: SkillMeta = {
      id: 'id',
      name: '  Foo  ',
      version: '1.0.0',
      author: 'a',
      description: '   description with spaces   ',
      tags: ['  JavaScript  ', 'AI ', '', 'typescript'],
      category: 'dev',
    };
    const n = SkillMetadata.normalize(m);
    expect(n.name).toBe('Foo');
    expect(n.tags).toEqual(['javascript', 'ai', 'typescript']);
    expect(n.description.startsWith('description')).toBe(true);
    expect(SkillMetadata.toLine(n)).toContain('Foo@1.0.0');
  });
});

describe('SkillSearch + SkillRecommender', () => {
  it('SkillSearch score + search + searchByCategory + searchByTag', () => {
    const r = new SkillRegistry(); seed(r);
    const s = new SkillSearch();
    expect(s.score(r.get('web-search')!, 'search')).toBeGreaterThan(0);
    const found = s.search(r, 'search', 5);
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].id).toBe('web-search');
    expect(s.searchByCategory(r, 'research').length).toBe(1);
    expect(s.searchByCategory(r, 'development').length).toBe(1);
    expect(s.searchByTag(r, 'agent').length).toBeGreaterThanOrEqual(2);
    expect(s.searchByTag(r, 'NOTHING').length).toBe(0);
  });

  it('SkillRecommender recommend + topRated', () => {
    const r = new SkillRegistry(); seed(r);
    const rec = new SkillRecommender();
    // Add a skill with overlapping tag
    r.register({
      id: 'claude-cli', name: 'Claude CLI', version: '1.0.0', author: 'x',
      description: 'cli wrapper', tags: ['agent', 'cli', 'mcp'], category: 'meta',
      ratingSum: 10, ratingCount: 2,
    });
    const recs = rec.recommend(r, 'web-search', 5);
    // Overlap: only code-review (agent), memory-store (agent), claude-cli (agent, mcp)
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].id).toBe('claude-cli'); // overlap=2 highest
    // topRated: web-search 47/12 ≈ 3.92, code-review 39/10 = 3.9, memory-store 42/11 ≈ 3.82, claude-cli 5.0
    const top = rec.topRated(r, 5);
    expect(top.length).toBe(5);
    expect(top[0].id).toBe('claude-cli'); // 10/2 = 5.0 highest
  });
});

describe('SkillInstaller + SkillVerifier', () => {
  it('SkillInstaller install + uninstall + isInstalled + installed + count + log', () => {
    const i = new SkillInstaller();
    i.install('web-search').install('code-review');
    expect(i.count()).toBe(2);
    expect(i.isInstalled('web-search')).toBe(true);
    expect(i.isInstalled('missing')).toBe(false);
    expect(i.installed().sort()).toEqual(['code-review', 'web-search']);
    expect(i.uninstall('web-search')).toBe(true);
    expect(i.uninstall('missing')).toBe(false);
    expect(i.count()).toBe(1);
    expect(i.log().length).toBe(3); // 2 installs + 1 uninstall
  });

  it('SkillVerifier verifyHash + computeHash + isValidSemver + isValidManifest', () => {
    const v = new SkillVerifier();
    const h = v.computeHash('hello');
    expect(v.verifyHash('hello', h)).toBe(true);
    expect(v.verifyHash('hellx', h)).toBe(false);
    expect(v.isValidSemver('1.2.3')).toBe(true);
    expect(v.isValidSemver('1.2.3-beta.1')).toBe(true);
    expect(v.isValidSemver('1.2')).toBe(false);
    expect(v.isValidSemver('bad')).toBe(false);
    const errs = v.isValidManifest({ id: 'a', name: 'A', version: '1.0.0', author: 'me', description: 'long enough description', tags: [], category: 'x' });
    expect(errs).toEqual([]);
    const errs2 = v.isValidManifest({});
    expect(errs2.length).toBeGreaterThan(0);
  });
});

describe('SkillVersioner + SkillDependencyResolver + SkillCategorizer', () => {
  it('SkillVersioner compare + latest + isNewer', () => {
    const v = new SkillVersioner();
    expect(v.compare('1.0.0', '1.0.1')).toBe(-1);
    expect(v.compare('1.1.0', '1.0.0')).toBe(1);
    expect(v.compare('1.0.0', '1.0.0')).toBe(0);
    expect(v.latest(['1.0.0', '1.2.0', '1.1.5'])).toBe('1.2.0');
    expect(v.isNewer('2.0.0', '1.0.0')).toBe(true);
  });

  it('SkillDependencyResolver resolve + missing', () => {
    const r = new SkillDependencyResolver();
    const graph = new Map([
      ['a', ['b', 'c']],
      ['b', ['d']],
      ['c', []],
      ['d', []],
    ]);
    const result = r.resolve(graph);
    expect(result.order.includes('a')).toBe(true);
    expect(result.order.includes('d')).toBe(true);
    // d before b before a
    expect(result.order.indexOf('d')).toBeLessThan(result.order.indexOf('b'));
    expect(result.order.indexOf('b')).toBeLessThan(result.order.indexOf('a'));
    const available = new Set(['b', 'c', 'd']);
    const missing = r.missing(graph, available);
    // a needs b, c; b needs d; all deps available → no missing
    expect(missing.length).toBe(0);
  });

  it('SkillCategorizer categorize + suggestTags', () => {
    const c = new SkillCategorizer();
    expect(c.categorize(['sql', 'data'])).toBe('data');
    expect(c.categorize(['email', 'slack'])).toBe('communication');
    expect(c.categorize(['mcp', 'skill'])).toBe('meta');
    expect(c.categorize([])).toBe('general');
    expect(c.suggestTags('My tool', 'Typescript CLI for testing').sort()).toEqual(['cli', 'test', 'typescript']);
    // categorize with dev tag
    expect(c.categorize(['git', 'lint'])).toBe('development');
  });
});

describe('SkillManifestValidator + SkillMarketplaceCoreIndex', () => {
  it('SkillManifestValidator validate + validateMany', () => {
    const v = new SkillManifestValidator();
    const meta: SkillMeta = {
      id: 'foo', name: 'Foo', version: '1.0.0', author: 'me',
      description: 'a very long description indeed',
      tags: [], category: 'dev',
    };
    const r1 = v.validate(meta, { files: ['index.ts', 'README.md'], entry: 'index.ts', license: 'MIT' });
    expect(r1.valid).toBe(true);
    expect(r1.warnings.length).toBe(0);
    const r2 = v.validate(meta, { files: ['README.md'], entry: 'index.ts', license: 'MIT' });
    expect(r2.valid).toBe(false);
    expect(r2.errors.some(e => e.includes('must be listed'))).toBe(true);
    const r3 = v.validate(meta, { files: [], entry: '', license: 'MIT' });
    expect(r3.valid).toBe(false);
    expect(r3.errors.length).toBeGreaterThan(1);
    // Missing license warning
    const r4 = v.validate(meta, { files: ['index.ts'], entry: 'index.ts' });
    expect(r4.valid).toBe(true);
    expect(r4.warnings.length).toBe(1);

    const r5 = SkillManifestValidator.validateMany(meta, [
      { files: ['index.ts'], entry: 'index.ts', license: 'MIT' },
      { files: ['README.md'], entry: 'index.ts' }, // entry not in files
    ]);
    expect(r5.valid).toBe(false);
    expect(r5.count).toBe(2);
    expect(r5.issues.length).toBeGreaterThan(0);
  });

  it('SkillMarketplaceCoreIndex', () => {
    const idx = new SkillMarketplaceCoreIndex();
    expect(idx.count()).toBe(11);
    expect(idx.list().length).toBe(11);
    expect(idx.has('SkillRegistry')).toBe(true);
    expect(idx.has('Missing')).toBe(false);
    expect(SKM_BATCH_1_ENGINES).toHaveLength(11);
  });
});
