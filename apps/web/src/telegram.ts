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
  openTelegramLink: (url: string) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive: boolean) => void;
    hideProgress: () => void;
    setParams: (params: any) => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export const tg = window.Telegram?.WebApp;
export const inTg = !!tg?.initData;

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

export function openTelegramLink(url: string) {
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, "_blank");
  }
}

export function alertMsg(message: string) {
  if (tg?.showAlert) {
    tg.showAlert(message);
  } else {
    window.alert(message);
  }
}

import { useEffect } from "react";

// Dev rejimida (Telegramdan tashqarida) test uchun initData
export function getInitData(): string {
  if (tg?.initData) return tg.initData;
  return import.meta.env.VITE_DEV_INIT_DATA ?? "";
}

export function useTelegramBackButton(onClick: () => void) {
  useEffect(() => {
    if (tg?.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(onClick);
      return () => {
        tg.BackButton.offClick(onClick);
        tg.BackButton.hide();
      };
    }
  }, [onClick]);
}

export function useTelegramMainButton(text: string, onClick: () => void, isVisible = true, isProgress = false) {
  useEffect(() => {
    if (tg?.MainButton) {
      if (isVisible) {
        tg.MainButton.setText(text);
        tg.MainButton.show();
      } else {
        tg.MainButton.hide();
      }
      if (isProgress) tg.MainButton.showProgress(false);
      else tg.MainButton.hideProgress();

      tg.MainButton.onClick(onClick);
      return () => {
        tg.MainButton.offClick(onClick);
        tg.MainButton.hide();
      };
    }
  }, [text, onClick, isVisible, isProgress]);
}
