/* AFRICA TOOLS · SENTRY (monitoreo de errores en producción)
   Se ejecuta después de que carga el bundle de Sentry desde su CDN (ver el <script> justo antes de este en cada página).
   Si por algún motivo el CDN no cargó (sin internet, bloqueado, etc.), simplemente no hacemos nada — la app sigue
   funcionando normal, solo sin reportar errores a Sentry ese rato.

   El DSN no es secreto: es seguro tenerlo visible en el navegador, igual que la anon key de Supabase.

   Privacidad (Fase 6): a Sentry NO deben viajar nombres de usuario, correos internos ni tokens de sesión. Se desactiva el
   envío de datos personales por defecto y, además, todo evento y rastro se limpia antes de salir (beforeSend/beforeBreadcrumb). */

(function () {
  var EMAIL_RE = /[A-Za-z0-9._%+\-]+@africatools\.internal/gi;                 // el "correo" interno que se deriva del usuario
  var TOKEN_RE = /eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g; // tokens JWT (sesiones, llaves)
  var BEARER_RE = /(Bearer\s+)[A-Za-z0-9._\-]{10,}/gi;

  function scrub(value, depth) {
    if (depth > 8 || value == null) return value;
    if (typeof value === 'string') return value.replace(EMAIL_RE, '[usuario]').replace(TOKEN_RE, '[token]').replace(BEARER_RE, '$1[token]');
    if (Array.isArray(value)) return value.map(function (v) { return scrub(v, depth + 1); });
    if (typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function (k) {
        // cabeceras y cookies nunca salen; el resto se limpia por contenido
        out[k] = /^(authorization|cookie|cookies|set-cookie|apikey|x-api-key|password|clave|token|access_token|refresh_token)$/i.test(k) ? '[quitado]' : scrub(value[k], depth + 1);
      });
      return out;
    }
    return value;
  }

  window.AfricaSentryScrub = scrub; // expuesto para las pruebas

  if (window.Sentry) {
    Sentry.init({
      dsn: 'https://bc75bd494be107bc037ddcfbeb76f453@o4511987246170112.ingest.us.sentry.io/4511987253444608',
      environment: (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'development' : 'production',
      // Solo monitoreo de errores — sin tracing ni session replay.
      tracesSampleRate: 0,
      sendDefaultPii: false,
      beforeSend: function (event) {
        delete event.user;                                   // nunca se asocia un error a una persona
        if (event.request) { delete event.request.cookies; delete event.request.headers; delete event.request.data; }
        return scrub(event, 0);
      },
      beforeBreadcrumb: function (crumb) {
        if (crumb && (crumb.category === 'ui.input' || crumb.category === 'console')) return null; // lo que se escribe en pantalla o se imprime puede incluir datos
        return scrub(crumb, 0);
      }
    });
  }
})();
