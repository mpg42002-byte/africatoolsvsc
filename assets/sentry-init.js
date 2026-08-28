/* AFRICA TOOLS · SENTRY (monitoreo de errores en producción)
   Se ejecuta después de que carga el bundle de Sentry desde su CDN
   (ver el <script> justo antes de este en cada página). Si por algún
   motivo el CDN no cargó (sin internet, bloqueado, etc.), simplemente
   no hacemos nada — la app sigue funcionando normal, solo sin reportar
   errores a Sentry ese rato.

   El DSN no es secreto: es seguro tenerlo visible en el navegador,
   igual que la anon key de Supabase (ver assets/supabase-config.js). */

if (window.Sentry) {
  Sentry.init({
    dsn: 'https://bc75bd494be107bc037ddcfbeb76f453@o4511987246170112.ingest.us.sentry.io/4511987253444608',
    environment: (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'development' : 'production',
    // Solo monitoreo de errores — sin tracing ni session replay (no los
    // activamos en el proyecto de Sentry, así que no hace falta configurarlos
    // aquí tampoco).
    tracesSampleRate: 0,
  });
}
