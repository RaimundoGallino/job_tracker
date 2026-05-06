# Job Tracker

App web para llevar el seguimiento de postulaciones laborales. Backend en Node.js (Express), frontend en React (vía CDN, sin build step). La base de datos es un único archivo JSON que vive en disco — no necesitás configurar nada.

## Features

- Dashboard con stats (postulaciones, entrevistas, ofertas, tasa de respuesta)
- Pipeline visual de estados con barras + donut chart
- Tabla con filtros, búsqueda y ordenamiento
- Estados: `Planned`, `Applied`, `Screening`, `Interview`, `Offer`, `Rejected`, `Withdrawn`
- Prioridad por job (alta / media / baja)
- Modal de detalle con búsqueda de recruiters en LinkedIn
- Export CSV
- Backups automáticos del JSON en cada escritura
- Persistencia automática: cualquier cambio se guarda al toque

## Requisitos

- Node.js >= 20

Eso es todo. La única dependencia de runtime es `express`, declarada en `package.json`.

## Instalación

```bash
git clone https://github.com/RaimundoGallino/job_tracker.git
cd job_tracker
npm install
```

## Uso

```bash
npm start
```

Abrí [http://localhost:8001](http://localhost:8001) en el browser.

El server escucha en `0.0.0.0:8001`, así que también podés acceder desde otros dispositivos en la misma red local.

## Formato de la base de datos

Los datos viven en `job-tracker-data.json` en la raíz del proyecto. El archivo tiene esta estructura:

```json
{
  "version": "server-1",
  "exported_at": "2026-05-06",
  "total": 2,
  "jobs": [
    {
      "id": 1,
      "company": "Acme Studios",
      "role": "Technical Artist",
      "status": "Applied",
      "date": "2026-05-06",
      "interviewDate": "",
      "contact": "Jane Doe",
      "contactTitle": "Senior Recruiter",
      "nextAction": "Esperar respuesta",
      "notes": "Postulación enviada vía LinkedIn",
      "location": "Barcelona (Híbrido)",
      "url": "https://example.com/jobs/123",
      "priority": "high",
      "description": "Descripción completa del puesto..."
    },
    {
      "id": 2,
      "company": "Pixel Forge",
      "role": "Senior Technical Artist",
      "status": "Planned",
      "date": "2026-05-06",
      "interviewDate": "",
      "contact": "",
      "contactTitle": "",
      "nextAction": "Revisar oferta",
      "notes": "",
      "location": "Remote",
      "url": "https://example.com/jobs/456",
      "priority": "medium",
      "description": ""
    }
  ]
}
```

### Campos por job

| Campo | Tipo | Notas |
|---|---|---|
| `id` | number | Único. Para entradas manuales podés usar `Date.now()` o cualquier número entero. |
| `company` | string | **Obligatorio.** Nombre de la empresa. |
| `role` | string | **Obligatorio.** Título del puesto. |
| `status` | string | Uno de: `Planned`, `Applied`, `Screening`, `Interview`, `Offer`, `Rejected`, `Withdrawn`. |
| `date` | string | Fecha de postulación, formato `YYYY-MM-DD`. |
| `interviewDate` | string | Fecha de entrevista, formato `YYYY-MM-DD` o vacío. |
| `contact` | string | Nombre del recruiter / contacto. |
| `contactTitle` | string | Cargo del contacto (opcional). |
| `nextAction` | string | Próxima acción a tomar. |
| `notes` | string | Notas libres. |
| `location` | string | Ubicación / modalidad. |
| `url` | string | URL del aviso. Importante: se usa para deduplicar al importar. |
| `priority` | string | `high`, `medium` o `low`. |
| `description` | string | Descripción completa del puesto (acepta saltos de línea). |

## API

| Método | Ruta | Body | Response |
|---|---|---|---|
| `GET` | `/` | — | Sirve `job-tracker.html` |
| `GET` | `/api/jobs` | — | Array de jobs |
| `PUT` | `/api/jobs` | Array de jobs | `{ ok: true, total: N }` |

`PUT` reemplaza el array completo (no es per-job). Antes de cada escritura el server hace un backup automático en `backups/`.

## Importar datos manualmente

### Opción 1: editar el JSON directamente

Parar el server, editar `job-tracker-data.json`, volver a arrancar. La app va a leer los nuevos datos al refrescar el browser.

### Opción 2: vía API (recomendado para imports masivos)

Si querés agregar una tanda de jobs sin pisar lo que ya tenés, usá un script Node como este:

```javascript
// import.mjs
const NEW_JOBS = [
  {
    id: Date.now(),
    company: "Studio X",
    role: "Technical Artist",
    status: "Planned",
    date: "2026-05-06",
    interviewDate: "",
    contact: "",
    contactTitle: "",
    nextAction: "Revisar oferta",
    notes: "",
    location: "Remote",
    url: "https://example.com/jobs/789",
    priority: "medium",
    description: ""
  }
  // ... más jobs
];

const API = 'http://localhost:8001/api/jobs';
const current = await (await fetch(API)).json();

// Deduplicar por URL
const existingUrls = new Set(current.map(j => (j.url || '').trim()).filter(Boolean));
const toAdd = NEW_JOBS.filter(j => !existingUrls.has((j.url || '').trim()));

if (toAdd.length === 0) {
  console.log('Nada nuevo que agregar.');
  process.exit(0);
}

const merged = [...toAdd, ...current];
const r = await fetch(API, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(merged)
});

console.log(`Agregados ${toAdd.length} jobs. Total: ${merged.length}`);
console.log(await r.json());
```

Correlo con `node import.mjs` mientras el server está corriendo. **Match por URL, no por ID** — los IDs pueden colisionar entre fuentes distintas.

## Estructura del proyecto

```
job_tracker/
├── server.js                  # Express server, puerto 8001
├── job-tracker.html           # SPA en React (CDN, sin build)
├── job-tracker-data.json      # Base de datos
├── package.json
├── backups/                   # Generado automáticamente (gitignored)
└── node_modules/              # npm install (gitignored)
```

## Backups

Cada vez que se hace un `PUT /api/jobs`, el server copia el JSON actual a `backups/job-tracker-data.<ISO timestamp>.json` antes de sobreescribir. Si algo se rompe, podés restaurar uno de esos archivos copiándolo encima de `job-tracker-data.json`.

La carpeta `backups/` está en `.gitignore`, no se versiona.

## Licencia

Personal use.
