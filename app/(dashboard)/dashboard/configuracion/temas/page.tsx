import type { Metadata } from "next";
import { ThemeSettings } from "@/components/settings/theme-settings";

export const metadata: Metadata = {
  title: "Temas",
};

export default function ThemesPage() {
  return <ThemeSettings />;
}
