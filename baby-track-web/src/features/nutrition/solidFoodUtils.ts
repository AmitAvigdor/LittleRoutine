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

export function combineSolidFoodDateAndTime(date: string, time: string): string | null {
  if (!time) return null;
  return new Date(`${normalizeSolidFoodDate(date)}T${time}:00`).toISOString();
}

export function getSolidFoodTimeInputValue(food: SolidFood): string {
  if (!food.timestamp) return '';
  const parsed = parseISO(food.timestamp);
  return isValid(parsed) ? format(parsed, 'HH:mm') : '';
}

export function formatSolidFoodTime(food: SolidFood): string | null {
  if (!food.timestamp) return null;
  const parsed = parseISO(food.timestamp);
  return isValid(parsed) ? format(parsed, 'h:mm a') : null;
}

export function getSolidFoodTimelineTimestamp(food: SolidFood): string {
  if (food.timestamp) return food.timestamp;
  if (normalizeSolidFoodDate(food.createdAt) === normalizeSolidFoodDate(food.date)) {
    return food.createdAt;
  }
  return `${normalizeSolidFoodDate(food.date)}T12:00:00`;
}

export function compareSolidFoodsNewestFirst(a: SolidFood, b: SolidFood): number {
  const dateComparison = normalizeSolidFoodDate(b.date).localeCompare(normalizeSolidFoodDate(a.date));
  if (dateComparison !== 0) return dateComparison;

  const timestampComparison = (b.timestamp ?? '').localeCompare(a.timestamp ?? '');
  if (timestampComparison !== 0) return timestampComparison;

  const createdComparison = (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  if (createdComparison !== 0) return createdComparison;

  return b.id.localeCompare(a.id);
}
