/** Hands a file to the browser's downloads (works on phones too). */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** "attachment; filename=WorkSphere-people.xlsx; filename*=UTF-8''..." -> the file name. */
export function fileNameFrom(disposition: string | null, fallback: string): string {
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition ?? '');
  if (star) return decodeURIComponent(star[1]);
  const plain = /filename="?([^";]+)"?/i.exec(disposition ?? '');
  return plain ? plain[1] : fallback;
}

export const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
