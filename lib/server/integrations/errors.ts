import "server-only";

/**
 * Error de un proveedor externo con un mensaje apto para mostrar al usuario.
 * Nunca debe incluir credenciales (api_key, secret, token) ni URLs que las contengan.
 */
export class IntegrationError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}
