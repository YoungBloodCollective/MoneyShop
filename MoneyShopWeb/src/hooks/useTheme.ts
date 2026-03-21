// Light-only theme (volt.ro style). Hook kept for API compatibility.
export function useTheme() {
  return { theme: 'light' as const, setTheme: () => {}, toggleTheme: () => {}, isDark: false };
}
