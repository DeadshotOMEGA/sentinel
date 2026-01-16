/**
 * HeroUI Tailwind v4 Plugin Configuration
 *
 * Usage in app's CSS file:
 * @plugin '../shared/ui/hero.ts';
 */
import { heroui } from "@heroui/react";
import { sentinelTheme } from "./theme";

export default heroui(sentinelTheme);
