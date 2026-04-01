# TGS Field — Plataforma de Campo

## Instalación rápida
```bash
chmod +x INSTALAR.sh && ./INSTALAR.sh
```

## Probar en local
```bash
npm start
```
→ Abre http://localhost:3000

## Deploy en Vercel
```bash
npx vercel
```

## Subdominio campo.agenciatgs.cl
En Hostinger DNS → agregar CNAME:
- Nombre: campo
- Valor: cname.vercel-dns.com

## Base de datos
Ya configurada en Supabase: https://ogdpxcrsfhncvmukrodm.supabase.co
- workers, campaigns, reports, boletas ✓
- Storage: photos, boletas, avatars ✓

## Usuarios demo (para testing)
- admin / cualquier password → panel admin
- super_rosa → supervisor
- promo1 → promotor
- carlos → implementador
