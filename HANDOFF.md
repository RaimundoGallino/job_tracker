# Job Tracker — Handoff para agente continuador

**Usuario:** Raimundo (Montevideo, Uruguay) — 3D Artist / Technical Artist buscando trabajo en game dev  
**Fecha última actualización:** 2026-04-22 (sesión 2 — migración a cliente-servidor)  
**Herramientas usadas:** Claude in Chrome (scraping LinkedIn), bash/Python (procesamiento), Claude Code (server Node/Express)

---

## 1. QUÉ SE CONSTRUYÓ

Una app cliente-servidor en Node.js + React (via CDN):

- **Server:** `server.js` — Express en puerto **8001**, sirve el HTML y expone API REST sobre `job-tracker-data.json`.
- **Client:** `job-tracker.html` — React single-file. Usa `fetch('/api/jobs')` en lugar de `localStorage`. Sin `DEFAULT_JOBS` embebido.
- **Persistencia:** `job-tracker-data.json` es la fuente única de verdad. Backups automáticos en `backups/` antes de cada escritura.

### Cómo correrlo
```bash
cd z:/Apps/JobTracker
npm install     # solo la primera vez
npm start       # arranca en http://localhost:8001
```

### Endpoints
| Método | Ruta | Body | Response |
|---|---|---|---|
| `GET` | `/` | — | `job-tracker.html` |
| `GET` | `/api/jobs` | — | `[ {id, company, role, ...}, ... ]` |
| `PUT` | `/api/jobs` | array JSON | `{ ok:true, total:N }` |

### Features del cliente (sin cambios respecto a la v1)
- Dashboard con stats (postulaciones, entrevistas, ofertas, tasa de respuesta)
- Pipeline de estados con barras + donut chart
- Tracker con tabla completa, filtros, ordenamiento
- Estados: `Planned / Applied / Screening / Interview / Offer / Rejected / Withdrawn`
- Prioridad por job (Alta/Media/Baja) con indicador de color
- Modal de detalle por job con sección de recruiter + botones de búsqueda en LinkedIn
- Formulario de edición/creación con campo de descripción del empleo
- Export CSV
- Banner de error rojo con botón "Reintentar" si el server no responde
- "Cargando..." mientras llega el primer fetch

### ⚠️ Cambios respecto a la versión localStorage
- Se eliminó `DEFAULT_JOBS`, `STORAGE_KEY`, `DATA_VERSION`, `VERSION_KEY`, `loadJobs()`, `saveJobs()`.
- Escrituras son optimistas: `setJobs(...)` actualiza UI y `pushJobs(...)` manda al server en paralelo. Si falla, aparece banner de error.
- Ya no hace falta el sistema de versioning para propagar updates: los datos viven en `job-tracker-data.json`, editables directamente en disco si hace falta.

---

## 2. DATOS ACTUALES

**Total: 43 jobs** scrapeados de LinkedIn (guardados guardados del perfil de Raimundo)

### Estados actuales
| Job | Empresa | Rol | Status | Notas |
|-----|---------|-----|--------|-------|
| id:20260422 | Larian Studios | Junior Technical Artist | **Applied** | Barcelona, on-site, HIGH priority |
| id:1 | UserWise | Technical Artist | **Applied** | Spain, remote |
| id:2 | NeoRonin Interactive | Technical Art Generalist | **Applied** | Portugal, remote, recruiter: Rodrigo Almeida |
| id:3-42 | Varios | Varios | **Planned** | Todos de LinkedIn saved jobs |

### Jobs con descripción completa scrapeada
- **id:1** UserWise — descripción completa
- **id:2** NeoRonin — descripción completa (3199 chars, la más detallada)
- **id:3** Metacore — descripción completa
- **id:4** Skydance Animation (Senior Rigging Artist) — descripción + contacto red: Víctor Reguera
- **id:5** Plarium — descripción completa
- **id:7** Hangar 13 (Lead TA Shaders, Brno) — descripción completa (AAA, UE5, Lumen/Nanite)
- **id:20260422** Larian Studios — descripción completa desde jobs.lever.co

### Jobs SIN descripción (37 restantes)
Jobs 6, 8-42 (excepto los listados arriba). Son todos `Planned`. 
IDs/URLs disponibles en el DEFAULT_JOBS del HTML.

---

## 3. COLORES / DISEÑO

Dark mode configurado con grises neutros oscuros (sin azul):
```css
--navy: #111214        /* header, botones primarios, tabs activos */
--navy2: #1c1c22       /* hover de navy */
--card: #18181c        /* fondo de cards */
--hover: #222228       /* hover rows */
--bg: #0c0c0e          /* fondo página */
--bg2: #16161b         /* fondo secundario */
--teal: #1d9e75        /* color acento principal (nombres empresa, badges) */
```

---

## 4. PENDIENTES / PRÓXIMOS PASOS

### A. Seguir scrapeando descripciones (37 jobs restantes)
**Patrón que funciona** con Claude in Chrome:
1. `navigate` al job URL
2. `computer scroll down` (8 ticks) para triggerear lazy load
3. `computer wait` 5-8 segundos
4. Click en el título del job (`computer left_click` en coordenada del título) — esto es KEY para activar la descripción
5. `wait` 8 segundos más
6. `get_page_text` — extrae todo el texto
7. Parsear con Python: buscar `Acerca del empleo` como marker de inicio, `Establecer una alerta` como fin
8. Recruiter: buscar `Conoce al equipo de contratación` en el texto

**Jobs externos** (dicen "Respuestas gestionadas fuera de LinkedIn") a veces NO cargan descripción en LinkedIn — hay que skipearlos o buscar el aviso en la web directa de la empresa.

URLs de los 37 jobs pendientes están en DEFAULT_JOBS del HTML — extraer con:
```python
import re, json
html = open('job-tracker.html').read()
m = re.search(r'const DEFAULT_JOBS=(\[.*?\]);', html, re.DOTALL)
jobs = json.loads(m.group(1))
pending = [j for j in jobs if not j.get('description')]
```

**Al guardar resultados en el HTML** — siempre usar:
```python
# Fix actual newlines en strings antes de json.loads
fixed = re.sub(r'"([^"]*)"', lambda mo: '"' + mo.group(1).replace('\n','\\n').replace('\r','\\r').replace('\t','\\t') + '"', raw)
jobs = json.loads(fixed)
# Serializar con json.dumps (maneja escaping correctamente)
jobs_str = json.dumps(jobs, ensure_ascii=False, separators=(',',':'))
# Reemplazar en HTML usando índices de posición, NO re.sub con strings (evita backslash issues)
new_html = html[:m.start(1)] + jobs_str + html[m.end(1):]
# Siempre bumpar DATA_VERSION después de cambios
```

### B. CV ATS Adapter
**Lo que quiere Raimundo:** dado su CV base + la descripción de un job específico, generar una versión del CV optimizada con las keywords del ATS de esa empresa.

Pendiente: Raimundo no subió su CV todavía. Cuando lo suba (PDF o Google Drive), el flujo sería:
1. Leer CV base
2. Tomar la descripción del job del tracker
3. Comparar keywords y secciones
4. Generar CV adaptado con prioridad en los términos que aparecen en la descripción

Herramientas relevantes del perfil de Raimundo: **Houdini 20.5, UE5, Blender, Python, shaders, procedural tools, VFX/Niagara** — importante que queden en todos los CVs adaptados.

### C. Deploy como app real
Ahora que hay server: cualquier VPS con Node 20+ sirve. Opciones:
- **Local + ngrok** (rápido, temporal): `ngrok http 8001` → URL pública.
- **Railway / Render / Fly.io**: push del repo, configurar `npm start`.
- **Netlify.com/drop** ya NO aplica porque la app requiere runtime de Node.

---

## 5. ARCHIVOS GENERADOS

| Archivo | Descripción |
|---------|-------------|
| `server.js` | Express server, puerto 8001, endpoints GET/PUT `/api/jobs` |
| `package.json` | Deps: `express` (ESM, `"type":"module"`) |
| `job-tracker.html` | App React single-file (fetch, sin localStorage) |
| `job-tracker-data.json` | **Base de datos.** Shape: `{version, exported_at, total, jobs[]}` |
| `backups/` | Copias automáticas del JSON antes de cada PUT (`job-tracker-data.<ISO>.json`) |
| `node_modules/` | Dependencias instaladas por npm |

---

## 6. CONTEXTO TÉCNICO IMPORTANTE

- La extensión **Claude in Chrome** se desconecta frecuentemente — hay que llamar `tabs_context_mcp(createIfEmpty=True)` al inicio de cada tanda de scraping
- El tab ID cambia en cada reconexión — siempre verificar con `tabs_context_mcp` antes de usar otros tools
- LinkedIn lazy-load: el contenido necesita scroll + click en el título para cargar la descripción
- Jobs con "Solicitud sencilla" (LinkedIn Easy Apply) cargan bien la descripción
- Jobs con "Respuestas gestionadas fuera de LinkedIn" a veces no cargan — skipear y marcar para buscar manualmente
- **NUNCA usar re.sub para reemplazar DEFAULT_JOBS** — usar índices `m.start(1)` y `m.end(1)` para evitar que backslashes en las descripciones rompan el JSON

---

## 7. PERFIL DEL USUARIO

- **Nombre:** Raimundo
- **Ubicación:** Montevideo, Uruguay
- **Rol:** 3D Artist / Technical Artist freelance
- **Tools principales:** Houdini 20.5, UE5.6, Blender
- **Buscando:** trabajo en game dev (Technical Artist / TA roles)
- **Postulaciones confirmadas:** Larian Studios (Barcelona), UserWise (Spain remote), NeoRonin (Portugal remote)
- **Idioma:** español casual, respuestas directas y sin vueltas
