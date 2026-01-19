
import { createClient } from '@supabase/supabase-js';

// URL do projeto Supabase Cloud Oficial
const supabaseUrl = 'https://phpmxzzscmbjrspsrxhj.supabase.co';

// Chave Anon Oficial fornecida
const supabaseAnonKey = 'sb_publishable_b9wuJLRa9RQsXx-XL21Dzg_3v5eqe1k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
