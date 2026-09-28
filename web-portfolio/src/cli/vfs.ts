export type FileType = 'file' | 'dir';

export interface VFSNode {
  type: FileType;
  name: string;
  content?: any;
  children?: Record<string, VFSNode>;
}

export class VirtualFileSystem {
  root: VFSNode;

  constructor(profile: any, experience: any[], projects: any[], skills: any[], achievements: any[]) {
    this.root = {
      type: 'dir',
      name: '~',
      children: {
        'about.md': { type: 'file', name: 'about.md', content: this.formatProfile(profile) },
        'experience': {
          type: 'dir',
          name: 'experience',
          children: this.buildExperienceNodes(experience)
        },
        'projects': {
          type: 'dir',
          name: 'projects',
          children: this.buildProjectNodes(projects)
        },
        'skills': {
          type: 'dir',
          name: 'skills',
          children: this.buildSkillNodes(skills)
        },
        'achievements': {
          type: 'dir',
          name: 'achievements',
          children: this.buildAchievementNodes(achievements)
        },
        'contact.txt': { type: 'file', name: 'contact.txt', content: 'Contact me at: ' + (profile?.email || 'N/A') },
        '.secret': { type: 'file', name: '.secret', content: 'You found the Flag! sudo hire-me' }
      }
    };
  }

  private formatProfile(profile: any) {
    if (!profile) return 'Loading...';
    return `# ${profile.name}\n${profile.title}\n\n${profile.bio_short}\n\nLocation: ${profile.location}\nGitHub: ${profile.github_url}`;
  }

  private buildExperienceNodes(experiences: any[]) {
    const nodes: Record<string, VFSNode> = {};
    experiences.forEach((exp, i) => {
      const filename = `${exp.company.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
      nodes[filename] = {
        type: 'file',
        name: filename,
        content: `# ${exp.role} @ ${exp.company}\n\n${exp.pointers.map((p: string) => `- ${p}`).join('\n')}\n\nTech Stack: ${exp.tech_stack.join(', ')}`
      };
    });
    return nodes;
  }

  private buildProjectNodes(projects: any[]) {
    const nodes: Record<string, VFSNode> = {};
    projects.forEach((proj, i) => {
      const filename = `${proj.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
      nodes[filename] = {
        type: 'file',
        name: filename,
        content: `# ${proj.title}\n\n${proj.one_liner}\n\nRole: ${proj.role}\n\n${proj.pointers.map((p: string) => `- ${p}`).join('\n')}\n\nTech Stack: ${proj.tech_stack.join(', ')}`
      };
    });
    return nodes;
  }

  private buildAchievementNodes(achievements: any[]) {
    if (!achievements) return {};
    const nodes: Record<string, VFSNode> = {};
    achievements.forEach(a => {
      const filename = `${a.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
      nodes[filename] = { type: 'file', name: filename, content: `Achievement: ${a.title}\n\n${a.description}` };
    });
    return nodes;
  }

  private buildSkillNodes(skills: any[]) {
    const nodes: Record<string, VFSNode> = {};
    const categories: Record<string, string[]> = {};
    skills.forEach(s => {
      if (!categories[s.category]) categories[s.category] = [];
      categories[s.category].push(s.name);
    });

    Object.keys(categories).forEach(cat => {
      const filename = `${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}.txt`;
      nodes[filename] = {
        type: 'file',
        name: filename,
        content: `## ${cat} Skills\n\n${categories[cat].join('\n')}`
      };
    });
    return nodes;
  }

  resolvePath(currentPath: string, targetPath: string): { error?: string, path?: string, node?: VFSNode } {
    if (!targetPath) return { path: currentPath, node: this.getNode(currentPath) };

    let parts = currentPath === '~' ? [] : currentPath.replace('~/', '').split('/').filter(Boolean);

    if (targetPath.startsWith('~')) {
      parts = [];
      targetPath = targetPath.substring(1);
    } else if (targetPath.startsWith('/')) {
      parts = []; // root is ~
      targetPath = targetPath.substring(1);
    }

    const targetParts = targetPath.split('/').filter(Boolean);

    for (const p of targetParts) {
      if (p === '.') continue;
      if (p === '..') {
        if (parts.length > 0) parts.pop();
        continue;
      }
      parts.push(p);
    }

    const finalPath = parts.length === 0 ? '~' : '~/' + parts.join('/');
    const node = this.getNode(finalPath);

    if (!node) return { error: `No such file or directory: ${targetPath}` };
    return { path: finalPath, node };
  }

  private getNode(path: string): VFSNode | undefined {
    if (path === '~' || path === '~/' || path === '/') return this.root;

    const parts = path.replace('~/', '').split('/').filter(Boolean);
    let curr = this.root;

    for (const p of parts) {
      if (curr.type !== 'dir' || !curr.children) return undefined;
      if (!curr.children[p]) return undefined;
      curr = curr.children[p];
    }
    return curr;
  }
}
