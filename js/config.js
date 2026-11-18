/* FinStack settings.
   Leave both values empty to keep everything in this browser only (no sign-in).
   Fill them in from Supabase → Project Settings → API to turn on accounts and cloud sync.
   The anon key is meant to be public: Row Level Security (supabase/schema.sql) is what protects the data. */
window.FINSTACK_CONFIG = {
  supabaseUrl: 'https://ohbqyfgptworatqozfys.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oYnF5ZmdwdHdvcmF0cW96ZnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMDU4OTAsImV4cCI6MjExMDU4MTg5MH0.8NSo1255W3WnmD4O_EFU-bXkVOQbL5dgZzcUKVjv6rs',
};
