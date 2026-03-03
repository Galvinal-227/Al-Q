import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mxveyjspnwidpsaorluu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dmV5anNwbndpZHBzYW9ybHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTMxOTcsImV4cCI6MjA4NzU4OTE5N30.c-E69DMKSdVEnZMJHAhls7H3-2ZcomOtDuPbpUAoXhs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);