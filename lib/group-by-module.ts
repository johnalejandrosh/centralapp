/** Agrupa elementos por su campo `module`, conservando el orden de aparición. */
export function groupByModule<T extends { module: string }>(items: T[]): { module: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    groups.set(item.module, [...(groups.get(item.module) ?? []), item]);
  }
  return [...groups].map(([module, groupItems]) => ({ module, items: groupItems }));
}
