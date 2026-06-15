const { createClient } = require('@supabase/supabase-js');

const s = createClient(
  'https://ogdpxcrsfhncvmukrodm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZHB4Y3JzZmhuY3ZtdWtyb2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzQyNjksImV4cCI6MjA5MDU1MDI2OX0.3gywVydN0LXhp-wrPe2vxOB9RUh2hzLoSLvsJbqXAPA'
);

const workers = [
  // ── IMPLEMENTADORES (10) ──
  {name:"Carlos Muñoz",rut:"12.345.678-9",phone:"+56912345001",email:"impl01@tgs.cl",region:"RM — Metropolitana",comuna:"Maipú",address:"Av. Pajaritos 3200",roles:["implementador"],status:"activo",lat:-33.511,lng:-70.763},
  {name:"Sebastián Araya",rut:"13.456.789-0",phone:"+56912345002",email:"impl02@tgs.cl",region:"Valparaíso",comuna:"Viña del Mar",address:"Av. Libertad 1100",roles:["implementador"],status:"activo",lat:-33.024,lng:-71.551},
  {name:"Javiera Contreras",rut:"14.567.890-1",phone:"+56912345003",email:"impl03@tgs.cl",region:"Biobío",comuna:"Concepción",address:"Calle Barros Arana 560",roles:["implementador"],status:"activo",lat:-36.827,lng:-73.049},
  {name:"Matías Rojas",rut:"15.678.901-2",phone:"+56912345004",email:"impl04@tgs.cl",region:"Araucanía",comuna:"Temuco",address:"Av. Alemania 800",roles:["implementador"],status:"activo",lat:-38.735,lng:-72.590},
  {name:"Camila Fuentes",rut:"16.789.012-3",phone:"+56912345005",email:"impl05@tgs.cl",region:"Los Lagos",comuna:"Puerto Montt",address:"Av. Diego Portales 450",roles:["implementador"],status:"activo",lat:-41.469,lng:-72.942},
  {name:"Nicolás Vega",rut:"17.890.123-4",phone:"+56912345006",email:"impl06@tgs.cl",region:"Coquimbo",comuna:"La Serena",address:"Av. Francisco de Aguirre 300",roles:["implementador"],status:"activo",lat:-29.907,lng:-71.254},
  {name:"Valentina Díaz",rut:"18.901.234-5",phone:"+56912345007",email:"impl07@tgs.cl",region:"Antofagasta",comuna:"Antofagasta",address:"Av. Angamos 700",roles:["implementador"],status:"activo",lat:-23.650,lng:-70.396},
  {name:"Felipe Herrera",rut:"19.012.345-6",phone:"+56912345008",email:"impl08@tgs.cl",region:"O'Higgins",comuna:"Rancagua",address:"Calle Independencia 150",roles:["implementador"],status:"activo",lat:-34.170,lng:-70.740},
  {name:"Isidora Pinto",rut:"20.123.456-7",phone:"+56912345009",email:"impl09@tgs.cl",region:"Maule",comuna:"Talca",address:"Calle 1 Sur 900",roles:["implementador"],status:"activo",lat:-35.426,lng:-71.655},
  {name:"Tomás Guerrero",rut:"21.234.567-8",phone:"+56912345010",email:"impl10@tgs.cl",region:"RM — Metropolitana",comuna:"Las Condes",address:"Av. Apoquindo 4500",roles:["implementador"],status:"activo",lat:-33.410,lng:-70.577},

  // ── PROMOTORES (10) ──
  {name:"Ana Soto",rut:"12.111.222-3",phone:"+56912345011",email:"promo01@tgs.cl",region:"RM — Metropolitana",comuna:"Providencia",address:"Av. Providencia 2100",roles:["promotor"],status:"activo",lat:-33.432,lng:-70.612},
  {name:"Diego Reyes",rut:"13.222.333-4",phone:"+56912345012",email:"promo02@tgs.cl",region:"RM — Metropolitana",comuna:"Santiago",address:"Alameda 1500",roles:["promotor"],status:"activo",lat:-33.449,lng:-70.660},
  {name:"Francisca López",rut:"14.333.444-5",phone:"+56912345013",email:"promo03@tgs.cl",region:"Valparaíso",comuna:"Valparaíso",address:"Av. Pedro Montt 2800",roles:["promotor"],status:"activo",lat:-33.046,lng:-71.620},
  {name:"Ignacio Tapia",rut:"15.444.555-6",phone:"+56912345014",email:"promo04@tgs.cl",region:"Biobío",comuna:"Talcahuano",address:"Av. Colón 500",roles:["promotor"],status:"activo",lat:-36.724,lng:-73.116},
  {name:"Catalina Morales",rut:"16.555.666-7",phone:"+56912345015",email:"promo05@tgs.cl",region:"Araucanía",comuna:"Villarrica",address:"Av. Pedro de Valdivia 200",roles:["promotor"],status:"activo",lat:-39.282,lng:-72.227},
  {name:"Martín Sepúlveda",rut:"17.666.777-8",phone:"+56912345016",email:"promo06@tgs.cl",region:"Los Lagos",comuna:"Osorno",address:"Calle Ramírez 700",roles:["promotor"],status:"activo",lat:-40.574,lng:-73.133},
  {name:"Sofía Bravo",rut:"18.777.888-9",phone:"+56912345017",email:"promo07@tgs.cl",region:"Tarapacá",comuna:"Iquique",address:"Av. Arturo Prat 1200",roles:["promotor"],status:"activo",lat:-20.213,lng:-70.152},
  {name:"Benjamín Castro",rut:"19.888.999-0",phone:"+56912345018",email:"promo08@tgs.cl",region:"Atacama",comuna:"Copiapó",address:"Av. Copayapu 600",roles:["promotor"],status:"activo",lat:-27.366,lng:-70.332},
  {name:"Antonia Figueroa",rut:"20.999.111-1",phone:"+56912345019",email:"promo09@tgs.cl",region:"Maule",comuna:"Curicó",address:"Calle Prat 400",roles:["promotor"],status:"activo",lat:-34.982,lng:-71.237},
  {name:"Joaquín Peña",rut:"21.111.222-2",phone:"+56912345020",email:"promo10@tgs.cl",region:"RM — Metropolitana",comuna:"Ñuñoa",address:"Av. Irarrázaval 3500",roles:["promotor"],status:"activo",lat:-33.454,lng:-70.600},

  // ── MECANIZADORES (10) ──
  {name:"Mario Vega",rut:"12.222.333-4",phone:"+56912345021",email:"mec01@tgs.cl",region:"RM — Metropolitana",comuna:"Santiago",address:"Calle San Diego 800",roles:["mecanizador"],status:"activo",lat:-33.457,lng:-70.648},
  {name:"Lorena Núñez",rut:"13.333.444-5",phone:"+56912345022",email:"mec02@tgs.cl",region:"RM — Metropolitana",comuna:"Quilicura",address:"Av. Manuel Antonio Matta 200",roles:["mecanizador"],status:"activo",lat:-33.364,lng:-70.735},
  {name:"Andrés Molina",rut:"14.444.555-6",phone:"+56912345023",email:"mec03@tgs.cl",region:"Valparaíso",comuna:"Quilpué",address:"Av. Los Carrera 1000",roles:["mecanizador"],status:"activo",lat:-33.047,lng:-71.441},
  {name:"Paula Vargas",rut:"15.555.666-7",phone:"+56912345024",email:"mec04@tgs.cl",region:"Biobío",comuna:"Los Ángeles",address:"Calle Colón 300",roles:["mecanizador"],status:"activo",lat:-37.469,lng:-72.353},
  {name:"Roberto Salas",rut:"16.666.777-8",phone:"+56912345025",email:"mec05@tgs.cl",region:"Coquimbo",comuna:"Coquimbo",address:"Av. Costanera 1500",roles:["mecanizador"],status:"activo",lat:-29.953,lng:-71.339},
  {name:"Daniela Ortiz",rut:"17.777.888-9",phone:"+56912345026",email:"mec06@tgs.cl",region:"Antofagasta",comuna:"Calama",address:"Av. Granaderos 400",roles:["mecanizador"],status:"activo",lat:-22.456,lng:-68.929},
  {name:"Gabriel Riquelme",rut:"18.888.999-0",phone:"+56912345027",email:"mec07@tgs.cl",region:"O'Higgins",comuna:"San Fernando",address:"Calle Manuel Rodríguez 250",roles:["mecanizador"],status:"activo",lat:-34.584,lng:-71.132},
  {name:"Fernanda Paz",rut:"19.999.111-1",phone:"+56912345028",email:"mec08@tgs.cl",region:"Los Lagos",comuna:"Puerto Varas",address:"Av. Vicente Pérez Rosales 600",roles:["mecanizador"],status:"activo",lat:-41.320,lng:-72.983},
  {name:"Esteban Cárdenas",rut:"20.111.222-2",phone:"+56912345029",email:"mec09@tgs.cl",region:"Araucanía",comuna:"Padre Las Casas",address:"Calle Cautín 100",roles:["mecanizador"],status:"activo",lat:-38.770,lng:-72.597},
  {name:"Macarena Torres",rut:"21.222.333-3",phone:"+56912345030",email:"mec10@tgs.cl",region:"RM — Metropolitana",comuna:"Pudahuel",address:"Av. La Estrella 2000",roles:["mecanizador"],status:"activo",lat:-33.443,lng:-70.750},

  // ── SUPERVISORES (10) ──
  {name:"Rosa Ibáñez",rut:"12.333.444-5",phone:"+56912345031",email:"super01@tgs.cl",region:"Araucanía",comuna:"Temuco",address:"Av. Caupolicán 900",roles:["supervisor"],status:"activo",lat:-38.739,lng:-72.598},
  {name:"Claudio Mendoza",rut:"13.444.555-6",phone:"+56912345032",email:"super02@tgs.cl",region:"RM — Metropolitana",comuna:"Providencia",address:"Av. Andrés Bello 2400",roles:["supervisor"],status:"activo",lat:-33.425,lng:-70.608},
  {name:"Patricia Avendaño",rut:"14.555.666-7",phone:"+56912345033",email:"super03@tgs.cl",region:"Valparaíso",comuna:"Viña del Mar",address:"Av. San Martín 800",roles:["supervisor"],status:"activo",lat:-33.019,lng:-71.553},
  {name:"Ricardo Fuenzalida",rut:"15.666.777-8",phone:"+56912345034",email:"super04@tgs.cl",region:"Biobío",comuna:"Concepción",address:"Av. O'Higgins 1200",roles:["supervisor"],status:"activo",lat:-36.820,lng:-73.044},
  {name:"Carmen Silva",rut:"16.777.888-9",phone:"+56912345035",email:"super05@tgs.cl",region:"Los Lagos",comuna:"Puerto Montt",address:"Av. Presidente Ibáñez 300",roles:["supervisor"],status:"activo",lat:-41.472,lng:-72.936},
  {name:"Jorge Espinoza",rut:"17.888.999-0",phone:"+56912345036",email:"super06@tgs.cl",region:"Coquimbo",comuna:"La Serena",address:"Calle Cordovez 500",roles:["supervisor"],status:"activo",lat:-29.904,lng:-71.249},
  {name:"Marcela Guzmán",rut:"18.999.111-1",phone:"+56912345037",email:"super07@tgs.cl",region:"Antofagasta",comuna:"Antofagasta",address:"Calle Prat 700",roles:["supervisor"],status:"activo",lat:-23.643,lng:-70.393},
  {name:"Héctor Paredes",rut:"19.111.222-2",phone:"+56912345038",email:"super08@tgs.cl",region:"Maule",comuna:"Talca",address:"Av. 2 Sur 1500",roles:["supervisor"],status:"activo",lat:-35.430,lng:-71.660},
  {name:"Alejandra Rivas",rut:"20.222.333-3",phone:"+56912345039",email:"super09@tgs.cl",region:"Tarapacá",comuna:"Iquique",address:"Calle Baquedano 900",roles:["supervisor"],status:"activo",lat:-20.216,lng:-70.148},
  {name:"Luis Garrido",rut:"21.333.444-4",phone:"+56912345040",email:"super10@tgs.cl",region:"Arica y Parinacota",comuna:"Arica",address:"Av. 21 de Mayo 400",roles:["supervisor"],status:"activo",lat:-18.479,lng:-70.311},
];

const SHARED_PASSWORD = 'tgs1234';

async function seed() {
  console.log(`Procesando ${workers.length} workers (auth + db)...\n`);

  let authOk = 0, authSkip = 0, authFail = 0;
  let dbOk = 0, dbSkip = 0, dbFail = 0;

  for (const w of workers) {
    const { error: authErr } = await s.auth.signUp({ email: w.email, password: SHARED_PASSWORD });
    if (authErr) {
      const m = authErr.message.toLowerCase();
      if (m.includes('already') || m.includes('registered') || m.includes('exists')) {
        console.log(`  ⏭ auth ${w.email} — ya existe`);
        authSkip++;
      } else {
        console.log(`  ✗ auth ${w.email} — ${authErr.message}`);
        authFail++;
      }
    } else {
      console.log(`  ✓ auth ${w.email}`);
      authOk++;
    }

    const { error: dbErr } = await s.from('workers').insert(w);
    if (dbErr) {
      if (dbErr.message.toLowerCase().includes('duplicate')) {
        console.log(`    ⏭ db ${w.name} — ya existe`);
        dbSkip++;
      } else {
        console.log(`    ✗ db ${w.name} — ${dbErr.message}`);
        dbFail++;
      }
    } else {
      console.log(`    ✓ db ${w.name} (${w.roles[0]}) — ${w.comuna}`);
      dbOk++;
    }

    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`  AUTH: ${authOk} creados · ${authSkip} ya existían · ${authFail} errores`);
  console.log(`  DB:   ${dbOk} creados · ${dbSkip} ya existían · ${dbFail} errores`);
  console.log(`  Password compartida: ${SHARED_PASSWORD}`);
  console.log(`═══════════════════════════════\n`);
}

seed();
