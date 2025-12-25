export type Theme = "dark" | "light"

export const themeManager = {
  getTheme: (): Theme => {
    if (typeof window === "undefined") return "dark"
    const stored = localStorage.getItem("theme") as Theme
    return stored || "dark"
  },

  setTheme: (theme: Theme) => {
    if (typeof window === "undefined") return
    localStorage.setItem("theme", theme)

    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  },

  toggleTheme: (): Theme => {
    const current = themeManager.getTheme()
    const newTheme = current === "dark" ? "light" : "dark"
    themeManager.setTheme(newTheme)
    return newTheme
  },

  init: () => {
    if (typeof window === "undefined") return
    const theme = themeManager.getTheme()
    themeManager.setTheme(theme)
  },
}
