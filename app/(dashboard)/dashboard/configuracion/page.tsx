import { redirect } from "next/navigation";

/** Configuración aún no tiene portada: se abre directamente en Temas. */
export default function SettingsPage() {
  redirect("/dashboard/configuracion/temas");
}
