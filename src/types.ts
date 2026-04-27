export interface ProjectLink {
  kind: 'repo' | 'demo' | 'disabled';
  label: string;
  href?: string;
}

export interface Project {
  id: string;
  title: string;
  host?: string | null;
  badge: { label: string; variant: 'default' | 'live' };
  description?: string;
  descriptionHtml?: string;
  stack: string[];
  links: ProjectLink[];
  thumbKind: 'tallerapp' | 'gym' | 'jasb' | 'trading';
  thumbImage?: string;
  thumbAlt?: string;
}
