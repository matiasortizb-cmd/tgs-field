const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ogdpxcrsfhncvmukrodm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZHB4Y3JzZmhuY3ZtdWtyb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzQyNjksImV4cCI6MjA5MDU1MDI2OX0.3gywVydN0LXhp-wrPe2vxOB9RUh2hzLoSLvsJbqXAPA'
);

async function seedAdmin() {
  const EMAIL = 'admin@tgs.cl';
  const PASSWORD = 'admin1';

  console.log('1. Creando cuenta en Supabase Auth...');
  const { data: auth, error: authErr } = await supabase.auth.signUp({ email: EMAIL, password: PASSWORD });
  if (authErr) {
    if (authErr.message.includes('already registered')) {
      console.log('   → Usuario auth ya existe, continuando...');
    } else {
      console.error('   ✗ Error auth:', authErr.message);
      return;
    }
  } else {
    console.log('   ✓ Auth creado:', auth.user?.id);
  }

  console.log('2. Insertando worker admin en tabla workers...');
  const { data: existing } = await supabase.from('workers').select('id').eq('email', EMAIL).single();
  if (existing) {
    console.log('   → Worker ya existe, actualizando roles y status...');
    const { error } = await supabase.from('workers').update({ roles: ['admin'], status: 'activo' }).eq('email', EMAIL);
    if (error) console.error('   ✗ Error update:', error.message);
    else console.log('   ✓ Worker actualizado');
  } else {
    const { error: wErr } = await supabase.from('workers').insert({
      name: 'Administrador TGS',
      email: EMAIL,
      phone: '+56900000000',
      rut: '00.000.000-0',
      region: 'RM — Metropolitana',
      comuna: 'Santiago',
      address: 'Oficina TGS',
      roles: ['admin'],
      status: 'activo',
    }).select().single();
    if (wErr) console.error('   ✗ Error insert:', wErr.message);
    else console.log('   ✓ Worker admin creado');
  }

  console.log('\n════════════════════════════════');
  console.log('  CREDENCIALES ADMIN');
  console.log('  Email:  admin@tgs.cl');
  console.log('  Clave:  admin1');
  console.log('════════════════════════════════\n');
}

seedAdmin();
