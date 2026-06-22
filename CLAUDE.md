# TGS Field

Plataforma web para gestionar campañas de terreno de la Agencia TGS (activaciones, supervisión y reportería al cliente).

## Stack

- React 18 + react-scripts (CRA)
- Supabase (auth + DB + storage): `https://ogdpxcrsfhncvmukrodm.supabase.co`
- Mapas: `react-leaflet` + `leaflet`
- Reportería PPT: `pptxgenjs@3.12.0` (ver "Decisiones")
- Excel: `xlsx`
- Deploy: Vercel → `campo.agenciatgs.cl` (CNAME en Planeta Hosting → `cname.vercel-dns.com`)

## Estructura

- `src/App.js` — todo el grueso de la app (auth, admin, supervisor, mapa, campañas, salas, aprobaciones). ~2100 líneas, monolítico a propósito por ahora.
- `src/ClientReport.js` — sistema de reportería para cliente (preview + PPT, 6 slides). ~500 líneas.
- `src/supabase.js` — cliente Supabase.
- `seed-admin.js`, `seed-workers.js` — scripts de seed.
- `INSTALAR.sh` — instalación rápida (`chmod +x INSTALAR.sh && ./INSTALAR.sh`).

## Roles del sistema

- **admin**: crea campañas (define tipo), carga salas masivo por Excel, gestiona workers, ve todos los reportes y reportería de cliente.
- **supervisor** (ej. `super_rosa`): aprueba/rechaza reportes, ve y descarga reportería de cliente. Puede tener varios puntos asignados.
- **implementador / mecánico**: puede tener varios puntos asignados.
- **promotor** (ej. `promo1`): trabajador de terreno, sube reportes.

Todos los roles tienen al registrarse: teléfono, dirección (calle, número, depto/extra como campo libre aparte para no romper Maps), región → comuna dependiente, ciudad. Esto habilita envío por WhatsApp.

## Recursos externos

- Supabase project: `ogdpxcrsfhncvmukrodm`
  - Tablas: `workers`, `campaigns`, `reports`, `boletas`
  - Storage buckets: `photos`, `boletas`, `avatars`
  - **Email confirmation desactivado** en Auth (decisión, ver abajo)
- DNS: Planeta Hosting, CNAME `campo` → `cname.vercel-dns.com`
- Deploy: `npx vercel`

## Usuarios demo (testing)

- `admin` / `admin` → panel admin
- `super_rosa` → supervisor
- `promo1` → promotor
- `carlos` → implementador

Hay 10 workers seed por categoría distribuidos en Chile y 20 puntos de activación seed para pruebas del mapa.

## Sistema de diseño visual (Variant B — sidebar oscuro + contenido claro)

Decisión tomada el 5 de mayo de 2026 después de extraer la identidad de TGS desde un PPT real (`VISITA COCA-COLA_MARZO 2026`). El esquema viejo (azul/teal sobre fondo `#07111C`) queda deprecado en favor de:

**Tokens** (definidos en `App.js` como objeto `T`):
- Fondo principal: `#FFFFFF` · Surface alt: `#F8F9FA`
- Sidebar/Nav: `#0A0A0A` (negro de marca) · texto blanco · acento amarillo
- Borde: `#E5E7EB` · Text: `#0A0A0A` · Text muted: `#6B7280`
- **Primary: `#F2AF22`** (amarillo TGS — extraído del PPT, 47 apariciones) · On-primary: `#000000`
- Tipografía: **Inter** (cargada en `public/index.html`)
- Radii: 14 cards / 10 botones · Shadows suaves

**Logo / brand assets** (en `public/brand/`):
- `tgs-logo.jpg` — oveja con halo + "TGS" — fondo NEGRO embebido (no transparente)
- `tgs-logo-tagline.jpg` — incluye "trademarketingmulticanal"
- `tgs-sheep.jpg` — solo la oveja (favicon, avatares)

**Limitación:** todos los assets tienen fondo negro porque vienen recortados de un slide del PPT. Estrategia de uso:
- Sobre superficies oscuras (sidebar, login splash, pantalla de carga): usar la imagen como está, queda integrada.
- Sobre superficies claras: enmarcar la imagen en un cuadrado/círculo de 0–24 px de radio para que se vea como un "badge" y no un cuadrado negro suelto.
- **Pendiente futuro**: conseguir el logo en SVG o PNG transparente desde un diseñador para tener flexibilidad total.

**Coexistencia con el sistema viejo:** los objetos `C` y `f` siguen existiendo en `App.js` y los usan todas las pantallas que aún no fueron migradas. La migración va pantalla por pantalla. El `LoginScreen` y la pantalla de carga ya están migradas a `T`.

## Decisiones que conviene recordar

- **`pptxgenjs` fijado en `3.12.0`**: la v4 usa `node:fs` y rompe el build con webpack 5 de CRA (`UnhandledSchemeError: Reading from "node:fs"`). No subir a v4 sin migrar fuera de CRA.
- **Email confirmation OFF en Supabase**: el flujo `admin/admin` daba "email not confirmed" al login. Se desactivó la confirmación por correo para destrabar testing. Si se prende otra vez, romperá los logins demo.
- **Mapa de Chile "caricaturizado"**: tilelayer simple, horizontal, ocupando ⅓ de la pantalla a la derecha; filtros a la izquierda; popups posicionados para no taparse en el extremo norte.
- **Asignación múltiple**: supervisores e implementadores pueden tener más de un punto; promotores no.
- **Carga masiva de salas vía Excel**: el admin descarga una plantilla al crear la campaña y la sube con `nombre`, `cadena`, `direccion`. Esto soporta campañas con muchas salas sin tener que cargarlas a mano.

## Reportería de cliente (`ClientReport.js`)

- Tab "Reportes" en navbar (admin + supervisor) lista campañas con reportes.
- Botón "Reporte cliente" en el detalle de cada campaña.
- 6 slides: portada (cliente, campaña, tipo, fechas, subtítulo editable), resumen ejecutivo con KPIs, ...
- Preview antes de descargar; intención de poder editarlo con AI antes del export (esto último quedó como objetivo, verificar si está implementado).

## Estado al 9 de abril de 2026

- Build pasa limpio (`npx react-scripts build`).
- Reportería de cliente recién terminada con `pptxgenjs@3` funcionando.
- **Sin verificar**: si se llegó a deployar a Vercel después de este último cambio.
- **Pendiente probable**: parte "editar con AI" del reporte — confirmar si quedó funcional o sólo preview + descarga.

## Estado al 20 de junio de 2026

Se commiteó y deployó a producción un bloque grande (`e12ed4d` y siguientes) que incluye:

- **Auth real con Supabase**: `LoginScreen` con email/password (`signIn`, `signUp`, `getSession`, `getWorkerByEmail`), `PendingScreen` para workers con status `pendiente`.
- **Componente `Icon`** SVG inline en lugar de emojis para nav y UIs.
- **Mapa real con Leaflet**: `WorkerMap`, `WorkerMapCampaignSelect`, `CampaignMapView` (tilelayer CARTO, popups con WhatsApp).
- **Campañas con salas georreferenciadas + Excel**: `salas[{name,chain,address,lat,lng}]`, plantilla descargable, upload `.xlsx`, helper `migrateInitial` para campañas viejas con `points`/`activationPoints` planos.
- **Registro** con `COMUNAS_POR_REGION` dependiente y submit real a Supabase.
- **`ClientReport`** integrado como tab en `AdminApp` y botón en el detalle de cada campaña.
- **`uploadBoleta`** y **`uploadPhoto`** reales contra Supabase storage.
- **`vercel.json`** simplificado a `rewrites`.

Encima de eso (commits posteriores):

- **`add keepalive workflow para Supabase`** (`001a90b`): `.github/workflows/keepalive.yml` con cron `0 12 */3 * *` que hace un SELECT trivial en `workers`. Necesario porque el free tier pausa proyectos a los ~7 días sin queries. Anon key hardcodeada (es pública).
- **`agrupar aprobaciones por campaña`** (`631949f`): `ApprovalTab` agrupa los reportes filtrados bajo un header por campaña (nombre + cliente + contador). Aplica a los tres tipos (impl/promo/mec) porque el componente es compartido.
- **`Recordar mis datos`** en LoginScreen (`afc532b`): checkbox marcado por default que persiste email + password en `localStorage` (`tgs_login`) y prefillea al cargar. Funciona tanto con bypass como con flow Supabase real.

### Bypass temporal de login (¡revertir!)

Commits `26ed47d`, `2176e54`, `cabcd63` agregan un bypass en `LoginScreen.handle` para destrabar testing mientras el provider Email de Supabase está disabled en el dashboard. Marcados con `// TODO REMOVE`. Credenciales (todas con password `tgsdev2026`):

- `dev@tgs.cl` / `dev-admin@tgs.cl` → Administrador TGS (admin)
- `dev-super@tgs.cl` → Rosa Ibáñez (supervisor)
- `dev-impl@tgs.cl` → Carlos Muñoz (implementador)
- `dev-promo@tgs.cl` → Ana Soto (promotor)
- `dev-mec@tgs.cl` → Mario Vega (mecanizador)

**Revertir**: `git revert cabcd63 2176e54 26ed47d` cuando el provider Email quede habilitado.

### TODOs activos en infraestructura

1. **Habilitar Email provider en Supabase** (Authentication → Providers → Email → toggle "Enable email provider" ON). Está como Disabled, por eso ningún login real funciona.
2. **Desactivar "Confirm email"** (donde sea que esté en la versión actual del dashboard). El default tras resume es ON y rompe los logins demo.
3. **Revertir el bypass** una vez resuelto lo anterior.
4. **Considerar upgrade Supabase Pro** ($25/mes) para evitar pausas y depender del keepalive.

### Operativa de deploy

- `git push origin main` dispara auto-deploy de Vercel (integración GitHub↔Vercel ya configurada).
- Vercel CLI requiere `vercel login` interactivo cuando se quiere deploy manual (la sesión expiró).
- Credenciales GitHub: PAT con scopes **`repo` + `workflow`** (el segundo es obligatorio para tocar `.github/workflows/`), guardado en macOS Keychain via `git credential approve`. URL del remote sin token incrustado.
- Si Vercel no buildea un push (le pasó al 22/06 con `fdd4c5c`), hacer `git commit --allow-empty -m "chore: trigger Vercel rebuild" && git push` para forzar el webhook.

## Estado al 22 de junio de 2026

Bloque grande de mejoras al flow de **clientes, items por reporte, asignación de salas, aprobación granular y corrección de rechazos**.

### Schema nuevo en Supabase (ALTER aplicados)

- `workers.address_detail text` — depto/oficina libre
- `campaigns.salas jsonb` — array de `{name, chain, address, lat, lng, assignedTo:[workerName]}`
- `campaigns.supervisors text[]`
- `campaigns.client_id uuid` (FK a `clients`)
- `reports.items jsonb` — array de `{name, photo, note, status, supervisorNote}`
- `reports.signed_photo text` — URL de la guía de despacho firmada
- `reports.approved_by text`
- Tabla nueva `clients (id, name, logo_url, contact_name, contact_email, contact_phone, notes, created_at)` con RLS abierta
- Buckets de storage: agregadas policies INSERT/SELECT/UPDATE para anon en `avatars`, `photos`, `boletas`, `client-logos` (sin DELETE, así nadie borra ajeno). El bucket `client-logos` se creó nuevo.

### Mappers camelCase ↔ snake_case en `src/supabase.js`

- `toDbCampaign` / `fromDbCampaign` (igual filosofía que `toDbReport` / `fromDbReport`)
- `toDbReport` / `fromDbReport` — el form usa `user/date/photos/geo/issueNote/popOk/...`; la tabla usa `worker_name/created_at/photos_urls/lat-lng/issue_note/pop_ok/...`
- `fromDbReport` deriva `date` formateado desde `created_at`, y reconstruye `geo: {lat,lng}` desde columnas separadas
- `photos_urls` es ARRAY en la tabla; mapper aplana el objeto `{a,b,c}` del form a array al insert y al revés en read

### Sistema de clientes (CRUD + análisis)

- `ClientsTab`, `ClientForm` (modal con upload de logo), `ClientDetail` (KPIs + lista de campañas)
- Tab "Clientes" en navbar admin (entre Inicio y Campañas)
- `CampaignForm` cambia el input libre por **dropdown de clientes** + opción "+ Crear nuevo cliente" que abre el `ClientForm` en modal y prefillea la campaña
- `fromDbCampaign` está al día con `client_id`; UI tolera ambas formas (string `client` o id)

### Items por reporte + aprobación granular

- Los 3 forms (`ImplForm`, `PromoForm`, `MecForm`) usan `ReportItemsList` compartido (a nivel módulo): lista dinámica de `items[]` con nombre + foto + nota
- Foto general opcional aparte (vista del PdV / vista del lugar)
- ApprovalModal muestra los items con miniaturas, estado por item, botones aprobar/rechazar individuales y textarea para `supervisorNote` cuando se rechaza
- `updateReportItems(id, items)` persiste cambios granulares (status + nota) sin tocar el resto del reporte
- Botones globales del reporte (Aprobar/Rechazar/Solicitar corrección) siguen vivos

### Asignación de salas por worker

- Cada sala dentro de la campaña tiene `assignedTo: [workerName]`
- `CampaignForm` muestra pills toggleables (uno por integrante del team) abajo de cada sala
- Nuevo flow del field worker: CampaignSelect → **SalaSelect** (lista solo las salas asignadas a él) → form de reporte con la sala precargada como card readonly
- Si la campaña no tiene salas asignadas (campañas viejas), salta SalaSelect y va directo al form (compatibilidad)

### Flow de rechazos completo

1. **Supervisor**: rechaza item → textarea para `supervisorNote` por item. Botón verde "Avisar al worker por WhatsApp" en el modal abre `wa.me` con mensaje precargado (nombre, sala, items rechazados con sus notas, comentario global). Si el worker no tiene phone, advierte.
2. **Worker (LandingScreen)**: banner rojo expandible "Tenés N reportes con observaciones" + lista de campañas afectadas. Click → navega directo a SalaSelect de esa campaña. Cada vertical (Impl/Promo/Mec) muestra badge circular con número de rechazos.
3. **Worker (CampaignSelect / SalaSelect)**: card de campaña / sala con observaciones queda con borde rojo + pill "Con observaciones" + CTA cambia a "Corregir →".
4. **Worker (form)**: ImplForm/PromoForm/MecForm aceptan `initialReport`. Items **aprobados** quedan readonly (borde verde, pill APROBADO). Items **rechazados** quedan editables con la nota del supervisor visible arriba ("Supervisor: …"). Botón cambia a "Reenviar reporte corregido".
5. **Submit en modo corrección**: hace `updateReport(id, payload)` en lugar de insert. Conserva el id del reporte; los items aprobados conservan status, los corregidos vuelven a `pending`.

### Selector de rol en el TopBar

- `RoleSwitchBanner` sticky debajo del TopBar (no el select chico del header, ese quedó atrás). Pills horizontales con cada rol del worker; cambiar rol re-renderiza la app (AdminApp vs LandingScreen) según corresponda.
- Aplica si el user tiene ≥2 roles. Funciona tanto en AdminApp como en LandingScreen.

### UX del registro y uploads

- RUT auto-formateado mientras se tipea (`12.345.678-9`)
- Foto de perfil con bottom-sheet **Tomar foto / Elegir desde archivos / Cancelar** (PhotoSlot también usa el mismo menú para fotos de reporte)
- `<label htmlFor>` envolviendo inputs para respetar `capture` en Safari iOS
- `uploadPhoto` sanitiza el path: NFD + replace de no-alfanuméricos → evita "Invalid key" cuando el label tiene tildes/espacios ("Guía firmada" → "Guia-firmada")
- Foto de **guía de despacho firmada** cuando el worker marca "Firma del local"
- Registro idempotente: si signUp da "already registered" y no hay worker, completa el insert (recupera intentos previos fallidos)
- Inputs del CampaignForm no perdían el foco al tipear: `Section`/`PersonRow` movidos a nivel módulo (`FormPersonRow`)

### Dashboard admin

- 4 KPI cards de la pantalla "Inicio" son **clicables** y navegan al área correspondiente (Campañas activas → tab Campañas, Reportes hoy/Pendientes/Aprobados → tab Aprobar con el filtro seteado)
- `ApprovalTab` agrupa los reportes filtrados por **campaña** con header (nombre + cliente + count)

### Avatares y fotos

- Helper `avatarContent(photo, name)` decide si renderizar `<img>` (cuando es URL) o iniciales (legacy). Aplicado en los 5 lugares del código que renderizaban avatar (PersonRow, listado de workers, detalle del worker, LandingScreen, etc.)

### TODOs activos al 22 de junio

1. **Email provider de Supabase sigue Disabled** y "Confirm email" prendido — el bypass `tgsdev2026` sigue siendo el único login funcional. Cuando se destrabe, revertir los commits del bypass.
2. **Migración Fase 3 de clientes** (mover strings `Coca-Cola`, `Mars`, etc. a registros reales con `client_id`) — el SQL está documentado pero no se corrió.
3. **Pre-carga de reporte para Promo/Mec**: replicado el patrón. Los forms cambiaron de fotos fijas a items dinámicos: si hay reportes viejos en producción con la estructura anterior, mostrarlos puede dar nulls.

## Comandos útiles

```bash
npm start                       # dev server en http://localhost:3000
npx react-scripts build         # build de producción
npx vercel                      # deploy
node seed-admin.js              # seed del admin
node seed-workers.js            # seed de workers de prueba
```
