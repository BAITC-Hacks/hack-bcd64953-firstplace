export const MAX_CSV_BYTES = 5 * 1024 * 1024;
export function csvPrecheck(file: Pick<File, "name" | "size">): string | null {
  if (!file.name.toLowerCase().endsWith(".csv"))
    return "Выберите файл с расширением .csv.";
  if (file.size > MAX_CSV_BYTES) return "Файл превышает 5 МиБ.";
  if (file.size === 0) return "Файл пуст. Добавьте участников команды.";
  return null;
}
export const CSV_TEMPLATE =
  "member_name,email,university,skills,experience_years,portfolio_url\r\nExample Member,member@example.com,Example University,Python;SQL,1,https://example.com/portfolio\r\n";
export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
