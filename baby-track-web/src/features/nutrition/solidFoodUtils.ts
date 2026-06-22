import { format, isValid, parseISO } from 'date-fns';
import type { SolidFood } from '@/types';

export function normalizeSolidFoodDate(value: string): string {
  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoDate) return isoDate;

  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : value;
}

export function formatSolidFoodDate(value: string): string {
  const parsed = parseISO(normalizeSolidFoodDate(value));
  return isValid(parsed) ? format(parsed, 'MMM d, yyyy') : value;
}

export function compareSolidFoodsNewestFirst(a: SolidFood, b: SolidFood): number {
  const dateComparison = normalizeSolidFoodDate(b.date).localeCompare(normalizeSolidFoodDate(a.date));
  if (dateComparison !== 0) return dateComparison;

  const createdComparison = (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  if (createdComparison !== 0) return createdComparison;

  return b.id.localeCompare(a.id);
}
