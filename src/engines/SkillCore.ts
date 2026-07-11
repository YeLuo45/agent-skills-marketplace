// V1-V10: Agent Skills Marketplace Core Batch 1/3
// SkillRegistry + SkillMetadata + SkillSearch + SkillRecommender + SkillInstaller + SkillVerifier + SkillDependencyResolver + SkillVersioner + SkillCategorizer + SkillManifestValidator

export interface SkillMeta {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  tags: string[];
  category: string;
  repo?: string;
  sha256?: string;
  pulled?: number;
  ratingSum?: number;
  ratingCount?: number;
}

export class SkillRegistry {
  private _skills: Map<string, SkillMeta> = new Map();

  register(meta: SkillMeta): this {
    this._skills.set(meta.id, meta);
    return this;
  }

  get(id: string): SkillMeta | null {
    return this._skills.get(id) ?? null;
  }

  has(id: string): boolean {
    return this._skills.has(id);
  }

  remove(id: string): boolean {
    return this._skills.delete(id);
  }

  all(): SkillMeta[] {
    return [...this._skills.values()];
  }

  size(): number {
    return this._skills.size;
  }

  names(): string[] {
    return [...this._skills.keys()];
  }
}

export class SkillMetadata {
  // Normalize tags + trim description
  static normalize(meta: SkillMeta): SkillMeta {
    return {
      ...meta,
      tags: meta.tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0),
      description: meta.description.trim().slice(0, 500),
      name: meta.name.trim(),
    };
  }

  static toLine(meta: SkillMeta): string {
    return `${meta.name}@${meta.version} — ${meta.description.slice(0, 60)}`;
  }
}

export class SkillSearch {
  // Score-based search: name weight 3, tag weight 2, desc weight 1
  score(meta: SkillMeta, query: string): number {
    const q = query.toLowerCase().trim();
    if (q === '') return 0;
    let s = 0;
    if (meta.name.toLowerCase().includes(q)) s += 3;
    if (meta.tags.some(t => t.toLowerCase().includes(q))) s += 2;
    if (meta.description.toLowerCase().includes(q)) s += 1;
    return s;
  }

  search(registry: SkillRegistry, query: string, limit = 10): SkillMeta[] {
    return registry
      .all()
      .map(m => ({ m, s: this.score(m, query) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(x => x.m);
  }

  searchByCategory(registry: SkillRegistry, category: string): SkillMeta[] {
    return registry.all().filter(m => m.category === category);
  }

  searchByTag(registry: SkillRegistry, tag: string): SkillMeta[] {
    return registry.all().filter(m => m.tags.includes(tag.toLowerCase()));
  }
}

export class SkillRecommender {
  // Recommend skills sharing at least 1 tag, ranked by overlap
  recommend(registry: SkillRegistry, skillId: string, limit = 5): SkillMeta[] {
    const target = registry.get(skillId);
    if (!target) return [];
    const targetTags = new Set(target.tags);
    return registry
      .all()
      .filter(m => m.id !== skillId)
      .map(m => ({
        m,
        overlap: m.tags.filter(t => targetTags.has(t)).length,
        rating: m.ratingCount && m.ratingCount > 0 ? (m.ratingSum ?? 0) / m.ratingCount : 0,
      }))
      .filter(x => x.overlap > 0)
      .sort((a, b) => {
        if (b.overlap !== a.overlap) return b.overlap - a.overlap;
        return b.rating - a.rating;
      })
      .slice(0, limit)
      .map(x => x.m);
  }

  topRated(registry: SkillRegistry, limit = 10): SkillMeta[] {
    return registry
      .all()
      .filter(m => (m.ratingCount ?? 0) > 0)
      .sort((a, b) => {
        const ra = (a.ratingSum ?? 0) / (a.ratingCount ?? 1);
        const rb = (b.ratingSum ?? 0) / (b.ratingCount ?? 1);
        return rb - ra;
      })
      .slice(0, limit);
  }
}

export class SkillInstaller {
  private _installed: Set<string> = new Set();
  private _installLog: Array<{ ts: number; skillId: string; action: 'install' | 'uninstall' }> = [];

  install(skillId: string): this {
    this._installed.add(skillId);
    this._installLog.push({ ts: Date.now(), skillId, action: 'install' });
    return this;
  }

  uninstall(skillId: string): boolean {
    if (!this._installed.has(skillId)) return false;
    this._installed.delete(skillId);
    this._installLog.push({ ts: Date.now(), skillId, action: 'uninstall' });
    return true;
  }

  isInstalled(skillId: string): boolean {
    return this._installed.has(skillId);
  }

  installed(): string[] {
    return [...this._installed];
  }

  count(): number { return this._installed.size; }

  log(): Array<{ ts: number; skillId: string; action: 'install' | 'uninstall' }> {
    return [...this._installLog];
  }
}

export class SkillVerifier {
  // Verify sha256 content hash matches expected hash
  verifyHash(content: string, expectedHash: string): boolean {
    return this.computeHash(content) === expectedHash;
  }

  // Simple hash (not cryptographic, but consistent)
  computeHash(content: string): string {
    let h = 0;
    for (let i = 0; i < content.length; i++) {
      h = ((h * 31) + content.charCodeAt(i)) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  // Verify version string is valid semver
  isValidSemver(version: string): boolean {
    return /^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/.test(version);
  }

  // Sanity-check skill metadata shape
  isValidManifest(meta: Partial<SkillMeta>): string[] {
    const errs: string[] = [];
    if (!meta.id || typeof meta.id !== 'string' || meta.id.length === 0) errs.push('missing id');
    if (!meta.name || typeof meta.name !== 'string') errs.push('missing name');
    if (!meta.version || !this.isValidSemver(meta.version)) errs.push('invalid version (expected semver MAJOR.MINOR.PATCH)');
    if (!meta.author || typeof meta.author !== 'string') errs.push('missing author');
    if (!meta.description || meta.description.length < 10) errs.push('description must be ≥10 chars');
    if (!Array.isArray(meta.tags)) errs.push('tags must be an array');
    if (!meta.category) errs.push('missing category');
    return errs;
  }
}

export class SkillVersioner {
  // Semver comparison: returns -1, 0, 1
  compare(a: string, b: string): number {
    const pa = a.split(/[.-]/);
    const pb = b.split(/[.-]/);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = Number(pa[i] ?? 0);
      const nb = Number(pb[i] ?? 0);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) {
        if (na !== nb) return na < nb ? -1 : 1;
      } else {
        const sa = pa[i] ?? '';
        const sb = pb[i] ?? '';
        if (sa !== sb) return sa < sb ? -1 : 1;
      }
    }
    return 0;
  }

  // Latest version from a list
  latest(versions: string[]): string {
    if (versions.length === 0) return '';
    return [...versions].sort((a, b) => this.compare(b, a))[0] ?? '';
  }

  isNewer(a: string, b: string): boolean {
    return this.compare(a, b) > 0;
  }
}

export class SkillDependencyResolver {
  // Resolve dependencies for a skill graph (Map<skillId, deps[]>)
  resolve(graph: Map<string, string[]>): { order: string[]; cycles: string[][] } {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const order: string[] = [];
    const cycles: string[][] = [];

    const visit = (id: string, path: string[]): void => {
      if (stack.has(id)) {
        cycles.push([...path, id]);
        return;
      }
      if (visited.has(id)) return;
      stack.add(id);
      const deps = graph.get(id) ?? [];
      for (const dep of deps) visit(dep, [...path, id]);
      stack.delete(id);
      visited.add(id);
      order.push(id);
    };

    for (const id of graph.keys()) visit(id, []);

    return { order, cycles };
  }

  // Missing dependencies for a skill
  missing(graph: Map<string, string[]>, available: Set<string>): string[] {
    const missing: string[] = [];
    for (const [id, deps] of graph.entries()) {
      for (const dep of deps) {
        if (!available.has(dep)) missing.push(`${id} -> ${dep}`);
      }
    }
    return missing;
  }
}

export class SkillCategorizer {
  // Auto-categorize based on tag presence
  categorize(tags: string[]): string {
    const t = tags.map(x => x.toLowerCase());
    const categories: Record<string, string[]> = {
      'productivity': ['task', 'todo', 'note', 'reminder', 'productivity'],
      'development': ['code', 'git', 'debug', 'test', 'build', 'deploy', 'lint', 'refactor'],
      'data': ['data', 'sql', 'csv', 'json', 'analysis', 'query'],
      'communication': ['email', 'chat', 'message', 'slack', 'discord'],
      'research': ['search', 'web', 'wiki', 'documentation', 'paper'],
      'creative': ['image', 'art', 'video', 'audio', 'design', 'music', 'writing'],
      'security': ['security', 'audit', 'penetration', 'vulnerability', 'pentest'],
      'devops': ['aws', 'kubernetes', 'docker', 'terraform', 'ci', 'cd', 'infra'],
      'meta': ['agent', 'skill', 'claude', 'codex', 'mcp', 'plugin'],
    };
    let best = 'general';
    let bestScore = 0;
    for (const [cat, keywords] of Object.entries(categories)) {
      let s = 0;
      for (const kw of keywords) {
        if (t.some(x => x.includes(kw))) s += 1;
      }
      if (s > bestScore) { bestScore = s; best = cat; }
    }
    return best;
  }

  // Suggest tags from name + description
  suggestTags(name: string, description: string): string[] {
    const text = `${name} ${description}`.toLowerCase();
    const candidates = [
      'javascript', 'typescript', 'python', 'rust', 'go',
      'react', 'vue', 'svelte',
      'cli', 'mcp', 'agent', 'rag', 'memory',
      'test', 'review', 'refactor',
      'sql', 'csv', 'json', 'yaml',
      'shell', 'bash', 'powershell',
    ];
    return candidates.filter(c => text.includes(c));
  }
}

export class SkillManifestValidator {
  private _errors: string[] = [];
  private _warnings: string[] = [];

  validate(meta: SkillMeta, manifest: { files: string[]; entry: string; license?: string }): { valid: boolean; errors: string[]; warnings: string[] } {
    this._errors = [];
    this._warnings = [];

    // Check meta validity
    const verifier = new SkillVerifier();
    const metaErrs = verifier.isValidManifest(meta);
    this._errors.push(...metaErrs);

    // Check files
    if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
      this._errors.push('files must be a non-empty array');
    }
    // Check entry
    if (typeof manifest.entry !== 'string' || manifest.entry.length === 0) {
      this._errors.push('entry must be a non-empty string');
    } else if (manifest.files.length > 0 && !manifest.files.includes(manifest.entry)) {
      this._errors.push(`entry "${manifest.entry}" must be listed in files`);
    }
    // License warning
    if (!manifest.license) {
      this._warnings.push('license field is missing — consider adding one');
    }

    return {
      valid: this._errors.length === 0,
      errors: [...this._errors],
      warnings: [...this._warnings],
    };
  }

  static validateMany(meta: SkillMeta, manifests: Array<{ files: string[]; entry: string; license?: string }>): { valid: boolean; count: number; issues: string[] } {
    const v = new SkillManifestValidator();
    let valid = 0;
    const issues: string[] = [];
    for (const m of manifests) {
      const r = v.validate(meta, m);
      if (r.valid) valid += 1;
      issues.push(...r.errors, ...r.warnings.map(w => `warning: ${w}`));
    }
    return { valid: valid === manifests.length, count: manifests.length, issues };
  }
}

// V10: SkillMarketplaceCoreIndex
export const SKM_BATCH_1_ENGINES = [
  'SkillRegistry', 'SkillMetadata', 'SkillSearch', 'SkillRecommender', 'SkillInstaller',
  'SkillVerifier', 'SkillVersioner', 'SkillDependencyResolver', 'SkillCategorizer', 'SkillManifestValidator',
  'SkillMarketplaceCoreIndex'
] as const;

export class SkillMarketplaceCoreIndex {
  list(): string[] {
    return [...SKM_BATCH_1_ENGINES];
  }
  count(): number {
    return SKM_BATCH_1_ENGINES.length;
  }
  has(name: string): boolean {
    return SKM_BATCH_1_ENGINES.includes(name as typeof SKM_BATCH_1_ENGINES[number]);
  }
}
