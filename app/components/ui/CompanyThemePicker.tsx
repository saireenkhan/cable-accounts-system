'use client';

import { Check } from 'lucide-react';
import { COMPANY_THEMES, type CompanyTheme } from '@/app/lib/companyThemes';

type Props = {
  value: CompanyTheme;
  onChange: (id: CompanyTheme) => void;
  disabled?: boolean;
};

/** Reusable, purely visual picker. No API calls or changes to package permissions. */
export default function CompanyThemePicker({ value, onChange, disabled = false }: Props) {
  return (
    <fieldset className="sm:col-span-2" disabled={disabled}>
      <legend className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        Company Theme *
      </legend>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Choose the appearance of this company's admin panel. All existing companies default to Original.
      </p>
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Company theme">
        {COMPANY_THEMES.map(theme => {
          const selected = value === theme.id;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              key={theme.id}
              onClick={() => onChange(theme.id)}
              className={`rounded-xl border-2 p-2 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${selected
                ? 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900'
                : 'border-slate-200 hover:border-slate-400 dark:border-slate-600'}`}
            >
              <div style={{ background: theme.background }} className="flex h-[88px] gap-2 overflow-hidden rounded-lg p-2">
                <div style={{ background: theme.sidebar }} className="h-full w-7 rounded-md" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div style={{ background: theme.card }} className="h-4 rounded" />
                  <div style={{ background: theme.accent }} className="h-4 w-2/3 rounded" />
                  <div style={{ background: theme.card }} className="flex-1 rounded" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{theme.name}</span>
                {selected && <Check size={17} className="text-emerald-600" aria-hidden />}
              </div>
              <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{theme.description}</p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
