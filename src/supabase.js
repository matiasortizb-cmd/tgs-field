import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ogdpxcrsfhncvmukrodm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZHB4Y3JzZmhuY3ZtdWtyb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzQyNjksImV4cCI6MjA5MDU1MDI2OX0.3gywVydN0LXhp-wrPe2vxOB9RUh2hzLoSLvsJbqXAPA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// AUTH
export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
export const signOut = () => supabase.auth.signOut();
export const getSession = () => supabase.auth.getSession();

// WORKERS
export const getWorkers = () => supabase.from('workers').select('*').order('name');
export const insertWorker = (w) => supabase.from('workers').insert(w).select().single();
export const updateWorker = (id, patch) => supabase.from('workers').update(patch).eq('id', id);

// CAMPAIGNS
export const getCampaigns = (type) => {
  let q = supabase.from('campaigns').select('*').order('created_at', { ascending: false });
  if (type) q = q.eq('type', type);
  return q;
};
export const insertCampaign = (c) => supabase.from('campaigns').insert(c).select().single();
export const updateCampaign = (id, patch) => supabase.from('campaigns').update(patch).eq('id', id);
export const deleteCampaign = (id) => supabase.from('campaigns').delete().eq('id', id);

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
export const uploadBoleta = async (file, workerId, campaignId) => {
  const ext = file.name.split('.').pop();
  const path = `${campaignId}/${workerId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('boletas').upload(path, file);
  if (error) throw error;
  return path;
};
