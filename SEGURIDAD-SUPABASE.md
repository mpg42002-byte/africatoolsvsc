# Seguridad del servidor (Supabase y Netlify): qué debe estar configurado

Esta lista es lo que NO se puede garantizar desde el código: son interruptores del panel de Supabase y de Netlify. Marca cada uno
cuando lo verifiques (y vuelve a revisarla si cambias de proyecto o de plan).

## Supabase → Authentication
- [ ] **Registro abierto apagado** (Sign In / Providers → "Allow new users to sign up" = OFF). Las cuentas las crea solo la función `manage-user`.
      *(Verificado apagado el 2026-10-26.)*
- [ ] **Longitud mínima de contraseña = 10 o más** (Sign In / Providers → Email → "Minimum password length"). El navegador y la función
      `manage-user` ya exigen 10, pero Supabase es la última barrera: sin esto, quien llame a la API directamente puede poner claves de 6.
- [ ] **Inicios de sesión anónimos apagados** (Allow anonymous sign-ins = OFF).
- [ ] **Confirmación de correo**: las cuentas usan un correo interno (`usuario@africatools.internal`) que no recibe mensajes; la función las crea
      ya confirmadas. No actives flujos de "olvidé mi contraseña" por correo: no llegarían a nadie. La clave se restablece desde Administración.
- [ ] **Límites de intentos** (Rate Limits): deja el límite de inicios de sesión por IP en su valor por defecto o más bajo. El bloqueo por intentos que se ve
      en la pantalla de login vive en el navegador y se salta llamando a la API; estos límites son los que protegen de verdad.
- [ ] **Caducidad del token** (JWT expiry): 3600 s (1 hora) o menos. Una cuenta desactivada se corta de los datos al instante por las políticas RLS, pero
      su token seguiría siendo válido hasta caducar.
- [ ] **Protección contra contraseñas filtradas** ("Leaked password protection"), si tu plan la incluye.
- [ ] **URL Configuration**: el "Site URL" es el de tu sitio y la lista de "Redirect URLs" no tiene comodines.

## Supabase → Database
- [ ] Todas las tablas del esquema `public` con **RLS activo** (lo muestra `supabase/00-diagnostico-rls.sql`).
- [ ] El rol `anon` (visitante sin sesión) no tiene permisos sobre ninguna tabla de la app.
- [ ] **Copias de seguridad** activadas (y haber probado restaurar al menos una vez).

## Netlify
- [ ] La variable `SUPABASE_SERVICE_ROLE_KEY` existe **solo** en Netlify (Site configuration → Environment variables), con alcance "Functions".
      Nunca en el código ni en el repositorio. Si alguna vez se pegó en un chat, un correo o un commit: **rotarla** (Supabase → Project Settings → API).
- [ ] `SUPABASE_URL` configurada. Opcional: `ALLOWED_ORIGINS` con otros dominios que deban poder llamar a `manage-user` (separados por coma).
- [ ] Tras cada despliegue: abrir `https://TU-SITIO/INSTRUCCIONES-SERVIDOR.md`, `/sql/`, `/tests/` y `/netlify/functions/manage-user.js`: deben dar 404.

## Sentry
- [ ] En el proyecto de Sentry: **Settings → Security & Privacy → "Prevent Storing of IP Addresses"** activado y "Data Scrubber" activado.
- [ ] En **Allowed Domains** del proyecto, solo el dominio de la app (evita que otros gasten tu cuota con tu DSN público).
