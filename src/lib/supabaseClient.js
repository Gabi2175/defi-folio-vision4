import { createClient } from '@supabase/supabase-js'

// ⚙️ Suas credenciais Supabase:
const supabaseUrl = 'https://gbsgbzuqjqrbxdhhhmdf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdic2dienVxanFyYnhkaGhobWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTk2MzMsImV4cCI6MjA3ODE3NTYzM30.QBTFiydLBEC46oFj4a0Xvep1QvOfkg0ExlsFAYKDJf4'

// 🚀 Cria o cliente Supabase que você pode usar em qualquer parte do app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
