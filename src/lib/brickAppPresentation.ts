/** Keep human-readable archive labels mapped to the daily chart/icon identity. */
export function brickAppIdentity(name: string): string {
  return ({ 'VS Code': 'Code.exe', Chrome: 'chrome.exe', '微信': 'Weixin.exe', Word: 'word', Excel: 'excel' } as Record<string, string>)[name] || name
}
