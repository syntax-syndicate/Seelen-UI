import { UserSettingsLoader } from '../settings/modules/shared/store/storeApi';
import { setColorsAsCssVariables } from '.';
import { Theme } from './schemas/Theme';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useEffect, useState } from 'react';

type Args = undefined | string | { [x: string]: any };
export const cx = (...args: Args[]): string => {
  return args
    .map((arg) => {
      if (!arg) {
        return;
      }

      if (typeof arg === 'string') {
        return arg;
      }

      let classnames = '';
      Object.keys(arg).forEach((key) => {
        if (arg[key]) {
          classnames += ` ${key}`;
        }
      });

      return classnames.trimStart();
    })
    .join(' ');
};

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setIsDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  });

  return isDarkMode;
}

export interface UIColors {
  background: string;
  foreground: string;
  accent_darkest: string;
  accent_darker: string;
  accent_dark: string;
  accent: string;
  accent_light: string;
  accent_lighter: string;
  accent_lightest: string;
  complement: string | null;
}

export class UIColors {
  static default(): UIColors {
    return {
      background: '#ffffff',
      foreground: '#000000',
      accent_darkest: '#990000',
      accent_darker: '#aa0000',
      accent_dark: '#bb0000',
      accent: '#cc0000',
      accent_light: '#dd0000',
      accent_lighter: '#ee0000',
      accent_lightest: '#ff0000',
      complement: null,
    };
  }
}

async function loadThemes(_themes?: Theme[]) {
  const seelenState = await new UserSettingsLoader().withThemes(!_themes).load();

  let selected = seelenState.jsonSettings.selectedTheme;
  let themes =
    _themes ||
    seelenState.themes
      .filter((theme) => selected.includes(theme.info.filename))
      .sort((a, b) => {
        return selected.indexOf(a.info.filename) - selected.indexOf(b.info.filename);
      });

  console.log(themes);

  if (themes.length === 0) {
    let defaultTheme = seelenState.themes.find((theme) => theme.info.filename === 'default');
    themes = defaultTheme ? [defaultTheme] : [];
  }

  const label = getCurrentWebviewWindow().label;
  let theme_key: keyof Theme['styles'] | null = null;
  if (label.startsWith('fancy-toolbar')) {
    theme_key = 'toolbar';
  } else if (label.startsWith('seelenweg')) {
    theme_key = 'weg';
  } else if (label.startsWith('window-manager')) {
    theme_key = 'wm';
  } else if (label.startsWith('seelen-launcher')) {
    theme_key = 'launcher';
  }

  if (!theme_key) {
    return;
  }

  document.getElementById(theme_key)?.remove();
  let element = document.createElement('style');
  element.id = theme_key.toString();
  element.textContent = '';
  document.head.appendChild(element);
  for (const theme of themes) {
    element.textContent += theme.styles[theme_key] + '\n';
  }
}

export async function StartThemingTool(dispatch: anyFunction) {
  await listen<UIColors>('colors', (event) => {
    setColorsAsCssVariables(event.payload);
    dispatch({ type: 'main/setColors', payload: event.payload });
  });

  await listen<Theme[]>('themes', (event) => {
    loadThemes(event.payload);
  });

  await loadThemes();
  await emit('register-colors-events');
}
