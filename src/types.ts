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
  thumbKind: 'tallerapp' | 'gym' | 'jasb' | 'trading' | 'finance';
  thumbImage?: string;
  thumbAlt?: string;
}

/* ---------------------------------------------------------------
   Project detail — the overlay opened from a project card.
   Screenshots live in src/data/projectShots.ts (shared by both
   locales); the text lives in projectDetails.{es,en}.ts and points
   at a screenshot by key.
   --------------------------------------------------------------- */

export interface ProjectShotRef {
  /** Key inside projectShots[projectId] */
  shot: string;
  alt: string;
}

export interface ProjectDetailSection extends ProjectShotRef {
  title: string;
  /** Plain paragraphs; inline HTML (<strong>, <em>) is allowed. */
  paragraphs: string[];
  /**
   * Optional portrait companion shown beside the main shot — for a section that
   * needs to show the same screen on desktop and on a phone.
   */
  phoneShot?: ProjectShotRef;
}

export interface ProjectDetail {
  /** Must match the Project.id of the card that opens it. */
  id: string;
  title: string;
  subtitle: string;
  /** Short stack chips shown in the sticky header. */
  badges: string[];
  hero: ProjectShotRef;
  intro: string[];
  sections: ProjectDetailSection[];
  /** Full stack line rendered in the footer. */
  stackFull: string;
  /** Showcase repo — omit while the repo does not exist yet. */
  repo?: { label: string; href: string };
}
