// Pressors as Intercept's clinicians count them (Nov 3, 2026, client feedback): epinephrine, phenylephrine,
// norepinephrine, vasopressin, dopamine, dobutamine and angiotensin II (Giapreza). Dobutamine is strictly an inotrope,
// but clinicians count it with them; milrinone isn't one. A patient's flag says how many are running ("1 pressor",
// "2 pressors"), because the count is how sick the shock is; the data (the API, or a sample) sets it from the drips.

/** Matches a pressor in a drug's name or a question, by generic or brand name. */
const pressorPattern = /\b(?:nor)?epinephrine\b|phenylephrine|vasopressin|dopamine|dobutamine|angiotensin ii|giapreza/i;

/** Whether a flag says the patient is on pressors, any count (the Organ support quick view, Filters, Ask). */
const isPressorFlag = (label: string) => /^\d+ pressors?$/.test(label);

export { isPressorFlag, pressorPattern };
