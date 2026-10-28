import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { theme } from "./theme";
import { getModeTheme, onStorageChange, type ModeTheme } from "../storage/storage";

type ThemeContextValue = ReturnType<typeof theme> & { modeTheme: ModeTheme };

const ThemeContext = createContext<ThemeContextValue>({
  ...theme(false),
  modeTheme: "system",
});

function usePreferredTheme(): ThemeContextValue {
  const scheme = useColorScheme();
  const [mode, setMode] = useState<ModeTheme>("system");

  useEffect(() => {
    let alive = true;
    getModeTheme().then((m) => {
      if (alive) setMode(m);
    });
    // Temps réel : suit le changement fait dans Paramètres depuis n'importe quel écran.
    const off = onStorageChange("theme", () => {
      getModeTheme().then((m) => {
        if (alive) setMode(m);
      });
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  const dark = mode === "system" ? scheme === "dark" : mode === "sombre";
  return useMemo(() => ({ ...theme(dark), modeTheme: mode }), [dark, mode]);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = usePreferredTheme();
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
