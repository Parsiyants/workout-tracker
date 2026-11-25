export function plural(count: number, forms: [string, string, string]): string {
  const mod100 = count % 100;
  const mod10 = count % 10;

  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function exercisesCount(count: number): string {
  return `${count} ${plural(count, ["упражнение", "упражнения", "упражнений"])}`;
}

export function setsCount(count: number): string {
  return `${count} ${plural(count, ["подход", "подхода", "подходов"])}`;
}
