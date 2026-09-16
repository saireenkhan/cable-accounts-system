export const areaName = (area: any, areas: any[] = []) => {
  if (!area) return 'N/A';
  if (typeof area === 'object' && area.name) return area.name;

  const id = typeof area === 'object' ? area._id : area;
  const found = areas.find(
    a => String(a._id) === String(id) ||
      String(a.name).toLowerCase() === String(area).toLowerCase()
  );

  return found?.name || 'N/A';
};

export const findPackage = (packages: any[], name: any) => {
  const key = String(name || '').trim().toLowerCase();
  return packages.find(
    p => String(p.name || '').trim().toLowerCase() === key
  );
};

export const dateInput = (value: any): string => {
  if (!value) return '';

  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const displayDate = (value: any) => {
  const s = dateInput(value);
  if (!s) return 'N/A';

  const [y, m, d] = s.split('-').map(Number);

  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const expiryDate = (value: any) => {
  const s = dateInput(value);
  if (!s) return '';

  const [y, m, d] = s.split('-').map(Number);
  const next = new Date(y, m, 1);
  const last = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0
  ).getDate();

  return dateInput(
    new Date(
      next.getFullYear(),
      next.getMonth(),
      Math.min(d, last)
    )
  );
};

export const effectiveStatus = (user: any) => {
  const status = String(
    user.statusRaw || user.status || 'active'
  ).toLowerCase();

  if (status === 'expired') return 'Expired';

  if (status === 'active' && user.expiryDate) {
    const expiry = dateInput(user.expiryDate);
    if (expiry && expiry < dateInput(new Date())) return 'Expired';
  }

  return ({
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
  } as Record<string, string>)[status] || 'Active';
};

export const upcomingExpiry = (user: any) => {
  if (!user.expiryDate || effectiveStatus(user) !== 'Active') return false;

  const expiry = dateInput(user.expiryDate);
  const now = new Date();
  const today = dateInput(now);
  const end = dateInput(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
  );

  return expiry > today && expiry <= end;
};

export const statusStyles: Record<string, string> = {
  Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  Expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Suspended: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};