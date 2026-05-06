import express from 'express';
import { readFile, writeFile, mkdir, copyFile, rename, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'job-tracker-data.json');
const BACKUPS_DIR = path.join(__dirname, 'backups');
const HTML_FILE = path.join(__dirname, 'job-tracker.html');
const PORT = 8001;

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => { console.log(`[${req.method}] ${req.url}`); next(); });

async function fileExists(p){
  try { await access(p); return true; } catch { return false; }
}

async function readData(){
  if(!(await fileExists(DATA_FILE))) return { version:'server-1', exported_at:'', total:0, jobs:[] };
  const raw = await readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

async function backup(){
  if(!(await fileExists(DATA_FILE))) return;
  await mkdir(BACKUPS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(BACKUPS_DIR, `job-tracker-data.${stamp}.json`);
  await copyFile(DATA_FILE, dest);
}

async function writeData(wrapper){
  const tmp = DATA_FILE + '.tmp';
  await writeFile(tmp, JSON.stringify(wrapper, null, 2), 'utf8');
  await rename(tmp, DATA_FILE);
}

app.get('/', (_req, res) => res.sendFile(HTML_FILE));

app.get('/api/jobs', async (_req, res) => {
  try {
    const data = await readData();
    res.json(Array.isArray(data.jobs) ? data.jobs : []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/jobs', async (req, res) => {
  try {
    const jobs = req.body;
    if(!Array.isArray(jobs)) return res.status(400).json({ error: 'Body must be an array' });
    await backup();
    const prev = await readData();
    const wrapper = {
      version: prev.version || 'server-1',
      exported_at: new Date().toISOString().split('T')[0],
      total: jobs.length,
      jobs
    };
    await writeData(wrapper);
    res.json({ ok: true, total: jobs.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Job Tracker server: http://localhost:${PORT}`);
});
