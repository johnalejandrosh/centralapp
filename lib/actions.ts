/** Resultado estándar de las Server Actions de formularios. */
export type ActionResult<Field extends string = string> = {
  ok: boolean;
  message?: string;
  /** La acción se completó, pero hay algo que revisar (se muestra como aviso, no como éxito). */
  warning?: boolean;
  fieldErrors?: Partial<Record<Field, string>>;
};

export const idleResult: ActionResult = { ok: false };
