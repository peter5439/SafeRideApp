import fs from 'fs';
import fetch from 'node-fetch';

const API_KEY = 'AIzaSyBQx5LJ8YGDX3RdFiH4-68318H7FzVlST4';
const users = JSON.parse(fs.readFileSync('./bulk_users.json', 'utf8'));

async function registerUser(user) {
  console.log(`Registering ${user.email}...`);
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        returnSecureToken: true
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    if (data.error) {
      console.error(`Error registering ${user.email}:`, data.error.message);
      return null;
    }
    return data.localId;
  } catch (error) {
    console.error(`Fetch error for ${user.email}:`, error);
    return null;
  }
}

async function run() {
  const results = [];
  for (const user of users) {
    const uid = await registerUser(user);
    if (uid) {
      results.push({ ...user, uid });
      console.log(`Successfully registered ${user.email} (UID: ${uid})`);
    }
  }
  fs.writeFileSync('./registered_users_with_uids.json', JSON.stringify(results, null, 2));
  console.log('Finished registration. UIDs saved to registered_users_with_uids.json');
}

run();
