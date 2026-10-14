const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=\"(.*)\"/)[1].trim();
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=\"(.*)\"/)[1].trim();

fetch(url + '/rest/v1/rpc/has_role', {
  method: 'POST',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
  }
}).then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2)));
