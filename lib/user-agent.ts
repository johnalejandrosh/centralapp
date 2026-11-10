export type DeviceInfo = { label: string; mobile: boolean };

const BROWSERS: [RegExp, string][] = [
  [/Edg(A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/HeadlessChrome\//, "Chrome sin interfaz"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Version\/.*Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/Windows/, "Windows"],
  [/Android/, "Android"],
  [/iPad/, "iPadOS"],
  [/iPhone|iPod/, "iOS"],
  [/CrOS/, "ChromeOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

/** "Mozilla/5.0 (Windows NT 10.0…) … Chrome/…" → { label: "Chrome en Windows", mobile: false }. */
export function describeUserAgent(userAgent: string | null): DeviceInfo {
  if (!userAgent) return { label: "Dispositivo desconocido", mobile: false };

  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? "Navegador";
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  return {
    label: system ? `${browser} en ${system}` : browser,
    mobile: /Mobi|Android|iPhone|iPad|iPod/.test(userAgent),
  };
}
