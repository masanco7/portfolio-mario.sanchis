/**
 * How the intro paragraphs of each project (projectDetails.<lang>.ts `intro`)
 * map onto the fixed sections of a case page. Indexes are shared by both
 * locales, so the two intro arrays must keep the same paragraph order.
 * Paragraphs not listed here (the closing "built with ..." stack sentence) are
 * already covered by the stack chips and `stackFull`.
 * A missing section is simply not rendered: there is no source copy for it yet.
 */
export interface CaseStructure {
  /** What it is and who it is for. */
  what: number[];
  /** The problem it solves. */
  problem?: number[];
  /** Technical decisions. */
  decisions: number[];
  /** Result / outcome beyond the status badge. */
  result?: number[];
}

export const caseStructure: Record<string, CaseStructure> = {
  tallerapp: { what: [0], decisions: [1, 2, 3], result: [4] },
  'gym-tracker': { what: [0], problem: [1], decisions: [2, 3] },
  polybot: { what: [0, 1], decisions: [2] },
};
