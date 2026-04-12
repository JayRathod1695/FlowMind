import { useTheme } from "../theme-provider";
import { Moon, Sun } from "lucide-react";
import { Button } from "../ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="w-9 h-9 border-2 border-border shadow-2xs hover:shadow-xs transition-all"
      title="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-[1rem] w-[1rem] text-accent transition-all" />
      ) : (
        <Moon className="h-[1rem] w-[1rem] text-foreground transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
