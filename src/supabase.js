import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ogdpxcrsfhncvmukrodm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZHB4Y3JzZmhuY3ZtdWtyb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzQyNjksImV4cCI6MjA5MDU1MDI2OX0.3gywVydN0LXhp-wrPe2vxOB9RUh2hzLoSLvsJbqXAPA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// AUTH
export const signUp = (email, password) => supabase.auth.signUp({ email, password });
export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
export const signOut = () => supabase.auth.signOut();
export const getSession = () => supabase.auth.getSession();
export const getWorkerByEmail = (email) => supabase.from('workers').select('*').eq('email', email).single();

// WORKERS
export const getWorkers = () => supabase.from('workers').select('*').order('name');
export const insertWorker = (w) => supabase.from('workers').insert(w).select().single();
export const updateWorker = (id, patch) => supabase.from('workers').update(patch).eq('id', id);

// CAMPAIGNS
// El form usa camelCase, la tabla usa snake_case → mapeamos en cada dirección
const toDbCampaign = (c) => {
  const out = {};
  if (c.type !== undefined) out.type = c.type;
  if (c.client !== undefined) out.client = c.client;
  if (c.client_id !== undefined) out.client_id = c.client_id || null;
  if (c.name !== undefined) out.name = c.name;
  if (c.status !== undefined) out.status = c.status;
  if (c.team !== undefined) out.team = c.team;
  if (c.dateStart !== undefined) out.date_start = c.dateStart || null;
  if (c.dateEnd !== undefined) out.date_end = c.dateEnd || null;
  if (c.payMode !== undefined) out.pay_mode = c.payMode || null;
  if (c.payAmount !== undefined) out.pay_amount = Number(c.payAmount) || 0;
  if (c.targetContacts !== undefined) out.target_contacts = c.targetContacts ? Number(c.targetContacts) : null;
  if (c.targetSamples !== undefined) out.target_samples = c.targetSamples ? Number(c.targetSamples) : null;
  if (c.days !== undefined) out.days = c.days ? Number(c.days) : null;
  if (c.totalUnits !== undefined) out.total_units = c.totalUnits ? Number(c.totalUnits) : null;
  if (c.material !== undefined) out.material = c.material || null;
  if (c.materials !== undefined) out.materials = c.materials || [];
  if (c.salas !== undefined) out.salas = c.salas || [];
  if (c.supervisors !== undefined) out.supervisors = c.supervisors || [];
  if (c.done !== undefined) out.done = c.done;
  return out;
};
export const fromDbCampaign = (c) => c && {
  ...c,
  dateStart: c.date_start || c.dateStart || '',
  dateEnd: c.date_end || c.dateEnd || '',
  payMode: c.pay_mode || c.payMode || '',
  payAmount: c.pay_amount ?? c.payAmount ?? '',
  targetContacts: c.target_contacts ?? c.targetContacts,
  targetSamples: c.target_samples ?? c.targetSamples,
  totalUnits: c.total_units ?? c.totalUnits,
  supervisors: c.supervisors || [],
  salas: c.salas || [],
  _saved: true,
};
export const getCampaigns = (type) => {
  let q = supabase.from('campaigns').select('*').order('created_at', { ascending: false });
  if (type) q = q.eq('type', type);
  return q;
};
export const insertCampaign = (c) => supabase.from('campaigns').insert(toDbCampaign(c)).select().single();
export const updateCampaign = (id, patch) => supabase.from('campaigns').update(toDbCampaign(patch)).eq('id', id);
export const deleteCampaign = (id) => supabase.from('campaigns').delete().eq('id', id);

// CLIENTS
export const getClients = () => supabase.from('clients').select('*').order('name');
export const insertClient = (c) => supabase.from('clients').insert(c).select().single();
export const updateClient = (id, patch) => supabase.from('clients').update(patch).eq('id', id);
export const deleteClient = (id) => supabase.from('clients').delete().eq('id', id);
export const uploadClientLogo = async (file, clientName) => {
  const ext = file.name.split('.').pop();
  const safe = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const path = `${safe}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('client-logos').upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('client-logos').getPublicUrl(path).data.publicUrl;
};

// WORKER RATINGS — calificación del worker por el admin al cerrar una campaña
// Una fila por (worker, campaña). scores = {puntualidad, calidad, comunicacion, presentacion}; score = promedio.
export const getAllWorkerRatings = () =>
  supabase.from('worker_ratings').select('*').order('created_at', { ascending: false });
export const getCampaignRatings = (campaignId) =>
  supabase.from('worker_ratings').select('*').eq('campaign_id', campaignId);
export const getWorkerRatings = (workerId) =>
  supabase.from('worker_ratings').select('*').eq('worker_id', workerId).order('created_at', { ascending: false });
export const upsertWorkerRating = (row) =>
  supabase.from('worker_ratings').upsert(row, { onConflict: 'worker_id,campaign_id' }).select().single();
// Recalcula el rating del perfil del worker como promedio de todas sus calificaciones y lo persiste en workers.rating
export const recalcWorkerRating = async (workerId) => {
  const { data } = await supabase.from('worker_ratings').select('score').eq('worker_id', workerId);
  if (data && data.length) {
    const avg = data.reduce((s, r) => s + (Number(r.score) || 0), 0) / data.length;
    const rounded = Math.round(avg * 10) / 10;
    await updateWorker(workerId, { rating: rounded });
    return { rating: rounded, count: data.length };
  }
  return { rating: 0, count: 0 };
};

// REPORTS
// Form usa camelCase y campos como user/date; la tabla usa snake_case y worker_name/created_at
const toDbReport = (r) => {
  const out = {};
  if (r.type !== undefined) out.type = r.type;
  if (r.status !== undefined) out.status = r.status;
  if (r.campaignId !== undefined) out.campaign_id = r.campaignId;
  if (r.user !== undefined) out.worker_name = r.user;
  if (r.store !== undefined) out.store = r.store;
  if (r.point !== undefined) out.point = r.point;
  if (r.location !== undefined) out.location = r.location;
  if (r.qty !== undefined) out.qty = r.qty;
  if (r.contacts !== undefined) out.contacts = r.contacts;
  if (r.samples !== undefined) out.samples = r.samples;
  if (r.units !== undefined) out.units = r.units;
  if (r.material !== undefined) out.material = r.material;
  if (r.items !== undefined) out.items = r.items;
  if (r.photos !== undefined) {
    // El form pasa photos como objeto {a, b, c} o {installed, general, ...}; la tabla espera ARRAY
    const flat = Array.isArray(r.photos) ? r.photos : Object.values(r.photos);
    out.photos_urls = flat.filter(Boolean);
  }
  if (r.photos_urls !== undefined) out.photos_urls = r.photos_urls;
  if (r.issues !== undefined) out.issues = r.issues;
  if (r.issueNote !== undefined) out.issue_note = r.issueNote;
  if (r.signed !== undefined) out.signed = r.signed;
  if (r.signedPhoto !== undefined) out.signed_photo = r.signedPhoto;
  if (r.popOk !== undefined) out.pop_ok = r.popOk;
  if (r.popNote !== undefined) out.pop_note = r.popNote;
  if (r.obs !== undefined) out.obs = r.obs;
  if (r.checkedIn !== undefined) out.checked_in = r.checkedIn;
  if (r.entryTime !== undefined) out.entry_time = r.entryTime;
  if (r.exitTime !== undefined) out.exit_time = r.exitTime;
  if (r.geo && (r.geo.lat || r.geo.lng)) { out.lat = r.geo.lat; out.lng = r.geo.lng; }
  if (r.supervisorComment !== undefined) out.supervisor_comment = r.supervisorComment;
  if (r.approvedBy !== undefined) out.approved_by = r.approvedBy;
  return out;
};
export const fromDbReport = (r) => r && {
  ...r,
  campaignId: r.campaign_id,
  user: r.worker_name,
  date: r.created_at ? new Date(r.created_at).toLocaleString('es-CL') : '',
  issueNote: r.issue_note,
  popOk: r.pop_ok,
  popNote: r.pop_note,
  checkedIn: r.checked_in,
  signedPhoto: r.signed_photo,
  entryTime: r.entry_time,
  exitTime: r.exit_time,
  supervisorComment: r.supervisor_comment,
  approvedBy: r.approved_by,
  geo: (r.lat || r.lng) ? { lat: r.lat, lng: r.lng } : null,
  items: r.items || [],
  photos_urls: r.photos_urls || [],
  // Mantener compat con código que lee r.photos como {a,b}
  photos: r.photos_urls ? { a: r.photos_urls[0], b: r.photos_urls[1], c: r.photos_urls[2] } : {},
};
export const getReports = (campaignId) => {
  let q = supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (campaignId) q = q.eq('campaign_id', campaignId);
  return q;
};
export const getMyReports = (workerName) =>
  supabase.from('reports').select('*').eq('worker_name', workerName).order('created_at', { ascending: false });
export const insertReport = (r) => supabase.from('reports').insert(toDbReport(r)).select().single();
export const updateReport = (id, patch) => supabase.from('reports').update(toDbReport(patch)).eq('id', id).select().single();
export const updateReportStatus = (id, status, comment) =>
  supabase.from('reports').update({ status, supervisor_comment: comment }).eq('id', id);
export const updateReportApproval = (id, status, comment, supervisorName) =>
  supabase.from('reports').update({ status, supervisor_comment: comment, approved_by: supervisorName }).eq('id', id);
export const updateReportItems = (id, items) =>
  supabase.from('reports').update({ items }).eq('id', id);

// BOLETAS
export const getBoletas = (campaignId) => {
  let q = supabase.from('boletas').select('*').order('created_at', { ascending: false });
  if (campaignId) q = q.eq('campaign_id', campaignId);
  return q;
};
export const insertBoleta = (b) => supabase.from('boletas').insert(b).select().single();
export const updateBoletaStatus = (id, status) => supabase.from('boletas').update({ status }).eq('id', id);

// STORAGE
export const uploadPhoto = async (file, reportId) => {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeId = String(reportId || 'r').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9_-]/g, '-');
  const path = `reports/${safeId}/${Date.now()}.${ext || 'jpg'}`;
  const { error } = await supabase.storage.from('photos').upload(path, file);
  if (error) throw error;
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
};
export const uploadAvatar = async (file, label) => {
  const ext = file.name.split('.').pop();
  const safe = (label || 'avatar').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const path = `${safe}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
};
export const uploadBoleta = async (file, workerId, campaignId) => {
  const ext = file.name.split('.').pop();
  const path = `${campaignId}/${workerId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('boletas').upload(path, file);
  if (error) throw error;
  return path;
};
