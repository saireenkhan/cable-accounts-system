export type CompanyTheme = 'original' | 'blue-black' | 'green-black';

export type CompanyThemePreset = {
  id: CompanyTheme;
  name: string;
  description: string;
  background: string;
  sidebar: string;
  card: string;
  accent: string;
  text: string;
};

/** Company themes are independent of package price and allowedPages. */
export const COMPANY_THEMES: readonly CompanyThemePreset[] = [
  { id: 'original', name: 'Original', description: 'Current Smart Recovery design (unchanged)',
    background: '#F4F7F9', sidebar: '#102A43', card: '#FFFFFF', accent: '#D6B138', text: '#08284D' },
  { id: 'blue-black', name: 'Blue & Black', description: 'Dark navy with bright-blue accents',
    background: '#070C15', sidebar: '#0D1727', card: '#172438', accent: '#1688FA', text: '#ECF5FF' },
  { id: 'green-black', name: 'Green & Black', description: 'Dark forest with emerald accents',
    background: '#07110E', sidebar: '#0D2019', card: '#173329', accent: '#18B67B', text: '#E9FFF4' },
];

export const resolveCompanyTheme = (value: unknown): CompanyTheme =>
  value === 'blue-black' || value === 'green-black' ? value : 'original';

export const companyThemeName = (value: unknown): string =>
  COMPANY_THEMES.find(t => t.id === resolveCompanyTheme(value))!.name;
