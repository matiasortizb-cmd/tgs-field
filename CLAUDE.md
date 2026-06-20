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

## Comandos útiles

```bash
npm start                       # dev server en http://localhost:3000
npx react-scripts build         # build de producción
npx vercel                      # deploy
node seed-admin.js              # seed del admin
node seed-workers.js            # seed de workers de prueba
```
