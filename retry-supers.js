const { createClient } = require('@supabase/supabase-js');

const s = createClient(
  'https://ogdpxcrsfhncvmukrodm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZHB4Y3JzZmhuY3ZtdWtyb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzQyNjksImV4cCI6MjA5MDU1MDI2OX0.3gywVydN0LXhp-wrPe2vxOB9RUh2hzLoSLvsJbqXAPA'
);

const SHARED_PASSWORD = 'tgs1234';
const PENDING = [
  'super04@tgs.cl', 'super05@tgs.cl', 'super06@tgs.cl',
  'super07@tgs.cl', 'super08@tgs.cl', 'super09@tgs.cl',
  'super10@tgs.cl',
];

async function retry() {
  console.log(`[${new Date().toISOString()}] Reintentando ${PENDING.length} cuentas...`);
  let ok = 0, skip = 0, fail = 0;
  for (const email of PENDING) {
    const { error } = await s.auth.signUp({ email, password: SHARED_PASSWORD });
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes('already') || m.includes('registered') || m.includes('exists')) {
        console.log(`  ⏭ ${email} — ya existe`);
        skip++;
      } else {
        console.log(`  ✗ ${email} — ${error.message}`);
        fail++;
      }
    } else {
      console.log(`  ✓ ${email}`);
      ok++;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`\nResultado: ${ok} creados · ${skip} ya existían · ${fail} errores`);
  console.log(`Password compartida: ${SHARED_PASSWORD}`);
}

retry().catch(e => { console.error('Error:', e); process.exit(1); });
