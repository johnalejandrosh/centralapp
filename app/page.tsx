import { redirect } from "next/navigation";
import { HOME_PATH } from "@/lib/auth/constants";

/** `proxy.ts` decide si `/dashboard` se muestra o se redirige a `/login`. */
export default function Home() {
  redirect(HOME_PATH);
}
