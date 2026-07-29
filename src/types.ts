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

/** Icons available to a section that ships without a capture. */
export type SectionIcon = 'ledger' | 'chart' | 'terminal' | 'timeline' | 'sliders';

/**
 * Marks a section as documented in text only. Set instead of `shot` when the
 * screen cannot be shown — POLYBOT, for instance, keeps every screen that would
 * expose a figure or a strategy parameter out of the gallery. The modal renders
 * a labelled icon plate in the media slot so the row still reads as a designed
 * block rather than a missing image.
 */
export interface SectionPlaceholder {
  icon: SectionIcon;
  /** Screen name shown under the icon. */
  label: string;
}

export interface ProjectDetailSection {
  title: string;
  /** Plain paragraphs; inline HTML (<strong>, <em>) is allowed. */
  paragraphs: string[];
  /** Key inside projectShots[projectId]. Omit when the section sets `placeholder`. */
  shot?: string;
  /** Alt text for `shot` — required whenever `shot` is set. */
  alt?: string;
  /**
   * Optional portrait companion shown beside the main shot — for a section that
   * needs to show the same screen on desktop and on a phone.
   */
  phoneShot?: ProjectShotRef;
  /** Set instead of `shot` for a screen documented without a capture. */
  placeholder?: SectionPlaceholder;
}

export interface ProjectDetail {
  /** Must match the Project.id of the card that opens it. */
  id: string;
  title: string;
  subtitle: string;
  /** Short stack chips shown in the sticky header. */
  badges: string[];
  /**
   * Cover shot for the card in the projects grid — NOT rendered inside the
   * panel, which opens straight on the write-up. Convention: always the login
   * screen in its desktop version, even for projects that also ship a PWA, so
   * every card in the grid reads the same.
   */
  hero: ProjectShotRef;
  intro: string[];
  sections: ProjectDetailSection[];
  /** Full stack line rendered in the footer. */
  stackFull: string;
  /** Showcase repo — omit while the repo does not exist yet. */
  repo?: { label: string; href: string };
}
