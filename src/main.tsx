import { supabase } from './lib/supabaseClient'
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

async function testConnection() {
    const { data, error } = await supabase.from('test_table').select('*')
    console.log('Conexão com Supabase:', { data, error })
  }
  testConnection()
  

createRoot(document.getElementById("root")!).render(<App />);
