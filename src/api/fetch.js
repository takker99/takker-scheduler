import { getAuthToken } from "./token.js";
let _auth;

export function init({ clientId, clientSecret, scopes }) {
  _auth = { clientId, clientSecret, scopes };
}

export async function exec(pathname, options = {}) {
  const { headers, ...rest } = options;
  return await fetch(`https://www.googleapis.com${pathname}`, {
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...headers,
    },
    ...rest,
  });
}

async function accessToken() {
  // 有効期限の1分前になったら更新する
  if ((_auth.expiresIn ?? 0) - new Date().getTime() < 1000 * 60) {
    // deno-lint-ignore camelcase
    const { access_token, expires_in } = await getAuthToken(_auth);
    _auth.expiresIn = new Date().getTime() + expires_in * 1000;
    _auth.accessToken = access_token;
  }
  return _auth.accessToken;
}
