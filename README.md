
# Zoo Schedule — listo para GitHub/Vercel
- **Local** funciona sin variables (usa localStorage).
- Si añades `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` se conecta a Supabase automáticamente.
- Botón "Neuer Eintrag" fijo, mini calendario oscuro con cierre al click fuera, sin celdas vacías, footer personalizado.

## Uso
```bash
npm i
npm run dev
```

## Deploy en Vercel
- Importa el repo desde GitHub.
- Añade las env vars anteriores.
- Deploy.

> `.gitignore` incluido para evitar subir `node_modules` y `.next` (problema de archivos >100MB en GitHub).
