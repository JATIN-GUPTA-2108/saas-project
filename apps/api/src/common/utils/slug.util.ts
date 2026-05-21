import { randomBytes } from 'crypto';

export function generateSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${randomBytes(3).toString('hex')}`;
}
