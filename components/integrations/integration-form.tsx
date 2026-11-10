"use client";

import { startTransition, useActionState, useState, useTransition, type FormEvent, type ReactNode } from "react";
import {
  CAlert,
  CButton,
  CForm,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CFormText,
  CInputGroup,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from "@coreui/react";
import {
  lookupAccountsAction,
  saveIntegrationAction,
  type IntegrationField,
  type ProviderAccount,
} from "@/app/(dashboard)/dashboard/integraciones/actions";
import type { ActionResult } from "@/lib/actions";
import { PROVIDER_LIST, PROVIDERS, type ProviderId } from "@/lib/integrations/catalog";
import type { IntegrationRow } from "@/lib/server/integration-queries";

/** Ojo abierto / tachado (CoreUI Free no trae este icono). */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {crossed ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <path d="M1 1l22 22" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

type SecretFieldProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  help: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  /** Se llama con el valor completo del campo justo después de pegar. */
  onPasted?: (value: string) => void;
  /** Botón extra a la derecha del ojo (p. ej. "Buscar tienda"). */
  action?: ReactNode;
  /** Mensaje de estado bajo el campo (resultado de la búsqueda). */
  status?: ReactNode;
};

/** Campo de clave con botón para mostrar u ocultar lo que se escribe. */
function SecretField({ id, name, label, placeholder, help, error, value, onChange, onPasted, action, status }: SecretFieldProps) {
  const [visible, setVisible] = useState(false);
  const helpId = `${id}-help`;

  return (
    <div>
      <CFormLabel htmlFor={id}>{label}</CFormLabel>
      <CInputGroup className="has-validation">
        <CFormInput
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={(event) => {
            const input = event.currentTarget;
            // El texto pegado se inserta después del evento: se lee en la siguiente vuelta.
            if (onPasted) setTimeout(() => onPasted(input.value), 0);
          }}
          invalid={Boolean(error)}
          aria-describedby={helpId}
        />
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          className="secret-field__toggle"
          onClick={() => setVisible((current) => !current)}
          aria-controls={id}
          aria-pressed={visible}
          aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
          title={visible ? "Ocultar" : "Mostrar"}
        >
          <EyeIcon crossed={visible} />
        </CButton>
        {action}
        {error && <CFormFeedback invalid>{error}</CFormFeedback>}
      </CInputGroup>
      {status}
      <CFormText id={helpId}>{help}</CFormText>
    </div>
  );
}

type IntegrationFormProps = {
  integration: IntegrationRow | null;
  /** Proveedor fijo (p. ej. en la página de Pancake). Si no se indica, se elige en el formulario. */
  provider?: ProviderId;
  onSaved: (result: ActionResult) => void;
  onCancel: () => void;
};

type LookupStatus = { tone: "success" | "info" | "warning" | "danger"; text: string } | null;

const idle: ActionResult<IntegrationField> = { ok: false };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function IntegrationForm({ integration, provider: fixedProvider, onSaved, onCancel }: IntegrationFormProps) {
  const [providerId, setProviderId] = useState<ProviderId>(
    () => (integration?.provider as ProviderId | undefined) ?? fixedProvider ?? PROVIDER_LIST[0].id,
  );
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [externalId, setExternalId] = useState(integration?.externalId ?? "");
  const [name, setName] = useState(integration?.name ?? "");
  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [lookup, setLookup] = useState<LookupStatus>(null);
  const [searching, startSearch] = useTransition();

  const [state, formAction, pending] = useActionState(async (previous: ActionResult<IntegrationField>, formData: FormData) => {
    const result = await saveIntegrationAction(previous, formData);
    if (result.ok) onSaved(result);
    return result;
  }, idle);

  const provider = PROVIDERS[providerId];
  const accountLookup = provider.accountLookup;
  const errors = state.fieldErrors ?? {};
  const chooseProvider = !integration && !fixedProvider && PROVIDER_LIST.length > 1;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  /** El nombre se completa con el de la cuenta, salvo que el usuario haya escrito uno propio. */
  function suggestName(account: ProviderAccount, known: ProviderAccount[]) {
    setName((current) => (!current.trim() || known.some((item) => item.name === current) ? account.name : current));
  }

  /** Consulta en el servidor las cuentas (tiendas) a las que da acceso la clave. */
  function findAccounts(key: string) {
    if (!accountLookup) return;
    const value = key.trim();
    if (!value && !integration) {
      setLookup({ tone: "warning", text: `Pega primero la ${provider.apiKey.label}.` });
      return;
    }
    startSearch(async () => {
      const result = await lookupAccountsAction({ provider: providerId, apiKey: value, integrationId: integration?.id ?? null });
      const found = result.accounts ?? [];
      setAccounts(result.ok ? found : []);
      if (!result.ok) {
        setLookup({ tone: "danger", text: result.message ?? "No se pudo hacer la búsqueda." });
      } else if (found.length === 0) {
        setLookup({ tone: "warning", text: `Esta ${provider.apiKey.label} no tiene ${accountLookup.nounPlural} asociadas.` });
      } else if (found.length === 1) {
        setExternalId(found[0].id);
        suggestName(found[0], found);
        setLookup({ tone: "success", text: `${capitalize(accountLookup.noun)} encontrada: ${found[0].name} (${found[0].id}).` });
      } else {
        setExternalId((current) => (found.some((account) => account.id === current) ? current : ""));
        setLookup({ tone: "info", text: `Encontramos ${found.length} ${accountLookup.nounPlural}: elige cuál conectar.` });
      }
    });
  }

  const keepHint = "Vacío = se conserva el valor guardado.";

  const apiKeyField = (
    <SecretField
      id="integration-api-key"
      name="apiKey"
      label={provider.apiKey.label}
      placeholder={integration?.apiKeyHint ? `Guardado (${integration.apiKeyHint})` : "Pega aquí la clave"}
      help={integration ? keepHint : provider.apiKey.help}
      error={errors.apiKey}
      value={apiKey}
      onChange={setApiKey}
      onPasted={accountLookup ? findAccounts : undefined}
      action={
        accountLookup && (
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            className="secret-field__toggle"
            onClick={() => findAccounts(apiKey)}
            disabled={searching}
          >
            {searching ? <CSpinner size="sm" aria-hidden /> : accountLookup.button}
          </CButton>
        )
      }
      status={
        (searching || lookup) && (
          <div className={`small mt-1 ${searching ? "text-body-secondary" : `text-${lookup!.tone}-emphasis`}`} role="status">
            {searching ? `Buscando ${accountLookup?.nounPlural ?? "cuentas"}…` : lookup!.text}
          </div>
        )
      }
    />
  );

  const apiSecretField = provider.apiSecret && (
    <SecretField
      id="integration-api-secret"
      name="apiSecret"
      label={provider.apiSecret.label}
      placeholder={integration?.apiSecretHint ? `Guardado (${integration.apiSecretHint})` : "Pega aquí la clave"}
      help={integration ? keepHint : provider.apiSecret.help}
      error={errors.apiSecret}
      value={apiSecret}
      onChange={setApiSecret}
    />
  );

  const externalIdField =
    accounts.length > 1 ? (
      <CFormSelect
        id="integration-external-id"
        name="externalId"
        label={provider.externalId.label}
        value={externalId}
        onChange={(event) => {
          setExternalId(event.target.value);
          const account = accounts.find((item) => item.id === event.target.value);
          if (account) suggestName(account, accounts);
        }}
        invalid={Boolean(errors.externalId)}
        feedbackInvalid={errors.externalId}
      >
        <option value="">Elige una {accountLookup?.noun ?? "cuenta"}…</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} — {account.id}
            {account.currency ? ` · ${account.currency}` : ""}
          </option>
        ))}
      </CFormSelect>
    ) : (
      <CFormInput
        id="integration-external-id"
        name="externalId"
        label={provider.externalId.label}
        placeholder={accountLookup ? `Se completa al buscar con la ${provider.apiKey.label}` : provider.externalId.placeholder}
        value={externalId}
        onChange={(event) => setExternalId(event.target.value)}
        // Muestra el valor como se va a guardar (p. ej. la URL del admin → dominio .myshopify.com).
        onBlur={() => setExternalId((current) => (current.trim() ? provider.externalId.normalize(current) : current))}
        inputMode={provider.externalId.inputMode}
        autoComplete="off"
        spellCheck={false}
        text={provider.externalId.help}
        invalid={Boolean(errors.externalId)}
        feedbackInvalid={errors.externalId}
      />
    );

  return (
    <CForm onSubmit={submit} noValidate>
      <CModalHeader>
        <CModalTitle id="integration-form-title">
          {integration ? `Editar conexión: ${integration.name}` : `Conectar ${provider.name}`}
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        {state.message && !state.ok && (
          <CAlert color="danger" className="py-2 small mb-0">
            {state.message}
          </CAlert>
        )}
        {integration && <input type="hidden" name="id" value={integration.id} />}

        {chooseProvider ? (
          <CFormSelect
            id="integration-provider"
            name="provider"
            label="Servicio"
            value={providerId}
            onChange={(event) => {
              setProviderId(event.target.value as ProviderId);
              setAccounts([]);
              setLookup(null);
              setExternalId("");
            }}
            invalid={Boolean(errors.provider)}
            feedbackInvalid={errors.provider}
          >
            {PROVIDER_LIST.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </CFormSelect>
        ) : (
          <input type="hidden" name="provider" value={providerId} />
        )}

        <details className="setup-steps" open={!integration && provider.setupSteps.length > 2}>
          <summary>¿Dónde consigo estos datos?</summary>
          <ol>
            {provider.setupSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>

        {/* Con búsqueda de cuentas la clave va primero (completa el identificador); si no, el identificador. */}
        {accountLookup ? (
          <>
            {apiKeyField}
            {externalIdField}
          </>
        ) : (
          <>
            {externalIdField}
            {apiKeyField}
            {apiSecretField}
          </>
        )}

        <CFormInput
          id="integration-name"
          name="name"
          label="Nombre de la conexión"
          placeholder={`Se usa el nombre de la ${accountLookup?.noun ?? "tienda"}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          text="Solo para reconocerla dentro de CentralApp."
          invalid={Boolean(errors.name)}
          feedbackInvalid={errors.name}
        />
        <CFormSwitch
          id="integration-active"
          name="active"
          label="Conexión activa"
          defaultChecked={integration?.active ?? true}
        />
        <p className="small text-body-secondary mb-0">
          Al guardar se hace una consulta de prueba a {provider.name} para confirmar que las credenciales funcionan. Quedan
          guardadas en la base de datos y solo las usa el servidor: el navegador nunca las vuelve a recibir.
        </p>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </CButton>
        <CButton type="submit" color="primary" disabled={pending || searching}>
          {pending && <CSpinner size="sm" className="me-2" aria-hidden />}
          {integration ? "Guardar cambios" : "Conectar"}
        </CButton>
      </CModalFooter>
    </CForm>
  );
}
