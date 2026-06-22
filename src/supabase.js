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

// REPORTS
export const getReports = (campaignId) => {
  let q = supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (campaignId) q = q.eq('campaign_id', campaignId);
  return q;
};
export const getMyReports = (workerName) =>
  supabase.from('reports').select('*').eq('worker_name', workerName).order('created_at', { ascending: false });
export const insertReport = (r) => supabase.from('reports').insert(r).select().single();
export const updateReportStatus = (id, status, comment) =>
  supabase.from('reports').update({ status, supervisor_comment: comment }).eq('id', id);
export const updateReportApproval = (id, status, comment, supervisorName) =>
  supabase.from('reports').update({ status, supervisor_comment: comment, approved_by: supervisorName }).eq('id', id);

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
  const ext = file.name.split('.').pop();
  const path = `reports/${reportId}/${Date.now()}.${ext}`;
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
