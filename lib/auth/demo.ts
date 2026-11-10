/** Cuenta creada por `prisma db seed`. El acceso rápido solo se muestra en desarrollo. */
export const DEMO_CREDENTIALS = {
  email: "demo@centralapp.com",
  password: "demo1234",
} as const;

export const SHOW_DEMO_LOGIN = process.env.NODE_ENV === "development";
