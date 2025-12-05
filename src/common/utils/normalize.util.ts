export function normalize(text: string): string {
  return text
    ?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^\w\s]/gi, '') // Elimina signos y símbolos
    .trim();
}
