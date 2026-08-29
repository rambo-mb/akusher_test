// Telegram WebApp bilan ishlash uchun yupqa qatlam.
// telegram-web-app.js index.html'da yuklangan -> window.Telegram.WebApp

interface TgWebApp {
  initData: string;
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  HapticFeedback?: {
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    impactOccurred: (style: "light" | "medium" | "heavy") => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export const tg = window.Telegram?.WebApp;

export function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  applyTheme();
}

function applyTheme() {
  if (!tg) return;
  const p = tg.themeParams;
  const root = document.documentElement.style;
  const set = (name: string, val?: string) => val && root.setProperty(name, val);
  set("--tg-bg", p.bg_color);
  set("--tg-text", p.text_color);
  set("--tg-hint", p.hint_color);
  set("--tg-link", p.link_color);
  set("--tg-button", p.button_color);
  set("--tg-button-text", p.button_text_color);
  set("--tg-secondary-bg", p.secondary_bg_color);
  document.body.dataset.theme = tg.colorScheme;
}

export function haptic(type: "success" | "error" | "warning") {
  tg?.HapticFeedback?.notificationOccurred(type);
}

export function tap() {
  tg?.HapticFeedback?.impactOccurred("light");
}

// Dev rejimida (Telegramdan tashqarida) test uchun initData
export function getInitData(): string {
  if (tg?.initData) return tg.initData;
  return import.meta.env.VITE_DEV_INIT_DATA ?? "";
}
