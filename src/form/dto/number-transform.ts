import type { TransformFnParams } from 'class-transformer';

export function toNumber({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string' || !value.trim()) return value;
  return Number(value);
}
