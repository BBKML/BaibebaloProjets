import fs from 'fs';
const path = 'src/pages/Users.jsx';
let s = fs.readFileSync(path, 'utf8');
// Fix apostrophe in placeholder that breaks JSX attribute
s = s.replace(
  /placeholder="Ex\. demande de l'utilisateur[^"]*"/,
  'placeholder={"Ex. demande du client"}'
);
fs.writeFileSync(path, s);
console.log('Done');
