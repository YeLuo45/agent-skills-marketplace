import { useEffect, useMemo, useState } from 'react';
import {
  SkillRegistry,
  SkillSearch,
  SkillRecommender,
  SkillInstaller,
  SkillVerifier,
  type SkillMeta,
} from './engines/SkillCore';
import { SEED_SKILLS, CATEGORIES } from './data/seedSkills';

const THEMES = ['light', 'dark', 'sepia', 'nord'] as const;
type Theme = typeof THEMES[number];

const STORAGE_THEME = 'asm:theme';
const STORAGE_INSTALLED = 'asm:installed';

export default function App() {
  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_THEME);
    return (THEMES as readonly string[]).includes(saved ?? '') ? (saved as Theme) : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_THEME, theme);
  }, [theme]);

  // Engines (memoized for stable identity)
  const registry = useMemo(() => {
    const r = new SkillRegistry();
    SEED_SKILLS.forEach(s => r.register(s));
    return r;
  }, []);
  const search = useMemo(() => new SkillSearch(), []);
  const recommender = useMemo(() => new SkillRecommender(), []);

  // Installed set + persist
  const [installed, setInstalled] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_INSTALLED);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    localStorage.setItem(STORAGE_INSTALLED, JSON.stringify([...installed]));
  }, [installed]);

  // Search/filter state
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'pulled' | 'rating' | 'name'>('pulled');
  const [recommendFor, setRecommendFor] = useState<string | null>(null);

  // Filtered + sorted skills
  const filtered = useMemo(() => {
    let results = query.trim() ? search.search(registry, query, 50) : registry.all();
    if (category !== 'all') {
      results = results.filter(s => s.category === category);
    }
    if (sortBy === 'name') {
      results = [...results].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'rating') {
      results = recommender.topRated(registry, 50).filter(s =>
        category === 'all' || s.category === category
      );
      if (query.trim()) results = results.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.tags.some(t => t.includes(query.toLowerCase())) ||
        s.description.toLowerCase().includes(query.toLowerCase())
      );
    } else {
      results = [...results].sort((a, b) => (b.pulled ?? 0) - (a.pulled ?? 0));
    }
    return results;
  }, [query, category, sortBy, registry, search, recommender]);

  // Recommended skill set
  const recommended = useMemo(() => {
    if (!recommendFor) return [];
    return recommender.recommend(registry, recommendFor, 5);
  }, [recommendFor, registry, recommender]);

  const handleInstall = (id: string) => {
    setInstalled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatStars = (n: number) => (n > 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

  const matchedTags = (skill: SkillMeta): Set<string> => {
    if (!query.trim()) return new Set();
    const q = query.toLowerCase();
    return new Set(skill.tags.filter(t => t.toLowerCase().includes(q)));
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-logo">⚡</div>
          <div>
            <div>Agent Skills Marketplace</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
              Curated registry for AI agent skills
            </div>
          </div>
        </div>
        <div className="search-bar">
          <input
            type="search"
            placeholder="Search skills by name, tag, or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search skills"
          />
        </div>
        <div className="header-actions">
          <div className="theme-switcher" role="group" aria-label="Theme switcher">
            {THEMES.map(t => (
              <button
                key={t}
                className={`theme-btn ${theme === t ? 'active' : ''}`}
                onClick={() => setTheme(t)}
                aria-label={`${t} theme`}
                aria-pressed={theme === t}
              >
                {t === 'light' ? '☀' : t === 'dark' ? '🌙' : t === 'sepia' ? '📜' : '❄'}
                <span style={{ marginLeft: 4 }}>{t}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="main">
        <div className="hero">
          <h1>Discover AI Agent Skills</h1>
          <p>
            A curated marketplace for the best Claude Code, Codex, and MCP skills.
            Search, install, and rate the skills that make your agents powerful.
          </p>
          <div className="hero-meta">
            <span><strong>{registry.size()}</strong> skills indexed</span>
            <span>•</span>
            <span><strong>{CATEGORIES.length - 1}</strong> categories</span>
            <span>•</span>
            <span><strong>{installed.size}</strong> installed locally</span>
          </div>
        </div>

        {installed.size > 0 && (
          <div className="installed-bar">
            <span>
              ✓ <strong>{installed.size}</strong> skill{installed.size === 1 ? '' : 's'} installed ·
              {Array.from(installed).slice(0, 3).join(', ')}
              {installed.size > 3 ? `, +${installed.size - 3} more` : ''}
            </span>
            <button onClick={() => setInstalled(new Set())}>clear all</button>
          </div>
        )}

        <div className="toolbar">
          <div className="category-list">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                className={`category-chip ${category === c.id ? 'active' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                <span className="category-dot" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={{ marginLeft: 'auto' }}
            aria-label="Sort"
          >
            <option value="pulled">Most installed</option>
            <option value="rating">Highest rated</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No skills found</h3>
            <p>Try a different search term or category.</p>
          </div>
        ) : (
          <div className="skill-grid">
            {filtered.map(skill => {
              const isInstalled = installed.has(skill.id);
              const matched = matchedTags(skill);
              const rating = skill.ratingCount && skill.ratingCount > 0
                ? (skill.ratingSum ?? 0) / skill.ratingCount
                : 0;
              const verifier = new SkillVerifier();
              const errs = verifier.isValidManifest(skill);
              return (
                <article key={skill.id} className="skill-card">
                  <div className="skill-header">
                    <h3 className="skill-name">
                      {skill.name}
                      <span className="skill-version">v{skill.version}</span>
                    </h3>
                  </div>
                  <div className="skill-author">
                    by{' '}
                    <a
                      href={`https://github.com/${skill.author}`}
                      target="_blank"
                      rel="noreferrer"
                      className="skill-author-link"
                    >
                      @{skill.author}
                    </a>
                  </div>
                  <p className="skill-description">{skill.description}</p>
                  <div className="skill-tags">
                    {skill.tags.map(t => (
                      <span key={t} className={`tag ${matched.has(t) ? 'matching' : ''}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="skill-meta">
                    <span className="skill-installs">
                      ↓ {formatStars(skill.pulled ?? 0)}
                    </span>
                    {rating > 0 && (
                      <span className="skill-rating">
                        ★ {rating.toFixed(1)} ({skill.ratingCount})
                      </span>
                    )}
                    {errs.length === 0 && (
                      <span style={{ color: 'var(--success)' }} title="verified manifest">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="skill-actions">
                    <button
                      className={`btn-install ${isInstalled ? 'installed' : ''}`}
                      onClick={() => handleInstall(skill.id)}
                      aria-label={isInstalled ? 'uninstall' : 'install'}
                    >
                      {isInstalled ? '✓ installed' : 'install'}
                    </button>
                    <button
                      className="btn-recommend"
                      onClick={() => setRecommendFor(skill.id)}
                    >
                      similar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          Built with React + TypeScript · Theme-aware CSS ·{' '}
          <a href={`${import.meta.env.BASE_URL ?? '/'}skill-registry`}>registry spec</a>
          {' '} · {registry.size()} skills indexed · open source MIT
        </p>
      </footer>

      {recommendFor && (
        <div className="modal-overlay" onClick={() => setRecommendFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Similar to {registry.get(recommendFor)?.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 0 }}>
              Based on shared tags and ratings
            </p>
            {recommended.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No similar skills found.</p>
            ) : (
              <div className="skill-grid" style={{ gridTemplateColumns: '1fr' }}>
                {recommended.map(s => (
                  <div key={s.id} className="skill-card">
                    <div className="skill-header">
                      <h3 className="skill-name">{s.name}</h3>
                      <span className="skill-version">v{s.version}</span>
                    </div>
                    <p className="skill-description">{s.description}</p>
                    <div className="skill-tags">
                      {s.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              style={{ marginTop: 16, padding: '8px 16px', background: 'var(--accent)', color: 'white', borderRadius: 6 }}
              onClick={() => setRecommendFor(null)}
            >
              close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
