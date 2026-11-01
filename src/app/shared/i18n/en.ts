export const en = {
  'nav.random': 'Random animal',
  'nav.add': 'Add animal',
  'nav.stats': 'Stats',
  'nav.label': 'Quick actions',
  'footer.unlocked': 'Editing unlocked',
  'footer.lock': 'Lock',
  'footer.admin': 'Admin',
  'language.label': 'Language',
} as const;
export type TranslationKey = keyof typeof en;