/* AFRICA TOOLS · SUPABASE CONFIG ·
   URL y llave pública de tu proyecto. Son seguras de tener aquí, visibles
   en el navegador — la seguridad real la hacen cumplir las reglas de
   Row Level Security que corriste en supabase_fase1_setup.sql, no el
   hecho de que esta llave esté oculta.

   La llave "service_role" NUNCA va en este archivo ni en ningún otro
   archivo del navegador — esa vive solo del lado del servidor, como
   variable de entorno en Netlify (ver netlify/functions/manage-user.js). */

const SUPABASE_URL = 'https://jzzabzpjpqfnofnezkaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6emFienBqcHFmbm9mbmV6a2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODk4NTAsImV4cCI6MjEwMjM2NTg1MH0.IwmbtzpN1lWms3oE3rDoz0qsGPRxUGcEWY6YKsdtCTA';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
