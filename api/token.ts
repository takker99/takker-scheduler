/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />

import { isString } from "../deps/unknownutil.ts";
import { sleep } from "../lib/sleep.ts";

export interface OpenAuthWindowProps {
  clientId: string;
  redirectURI?: URL | string;
  scopes: string[];
}
export function openAuthWindow(
  { clientId, redirectURI = "http://localhost:8080", scopes }:
    OpenAuthWindowProps,
) {
  window.open(
    `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectURI}&access_type=offline&scope=${
      scopes.join("%20")
    }`,
  );
}

export interface GetAuthTokenProps {
  clientId: string;
  clientSecret: string;
  scopes: string[];
}
export interface GetAuthTokenResult {
  // deno-lint-ignore camelcase
  access_token: string;
  // deno-lint-ignore camelcase
  expires_in: number;
  // deno-lint-ignore camelcase
  token_type: "Bearer";
  scope: string;
  // deno-lint-ignore camelcase
  refresh_token: string;
}
export async function getAuthToken(
  { clientId, clientSecret, scopes }: GetAuthTokenProps,
) {
  const redirectURI = "https://scrapbox.io";
  const popup = await openWithRetry(
    `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectURI}&scope=${
      scopes.join("%20")
    }`,
  );

  const pending = new Promise<string>((resolve, reject) => {
    const timer = setInterval(() => {
      if (popup.location.host !== "scrapbox.io") return;
      clearInterval(timer);
      console.log(popup.location.search);
      const params = new URLSearchParams(popup.location.search);
      const code = params.get("code");
      const error = params.get("error");
      popup.close();
      if (error) {
        reject(error);
        return;
      }
      if (!isString(code)) {
        reject(`"code" is not string.`);
        return;
      }
      resolve(code);
    }, 1000);
  });
  const authorizationCode = await pending;
  return await getTokens({
    clientId,
    clientSecret,
    authorizationCode,
    redirectURI,
  });
}

interface GetTokensProps {
  clientId: string;
  clientSecret: string;
  authorizationCode: string;
  redirectURI?: URL | string;
}
async function getTokens(
  {
    clientId,
    clientSecret,
    authorizationCode,
    redirectURI = "http://localhost:8080",
  }: GetTokensProps,
): Promise<GetAuthTokenResult> {
  // parametersを組み立てる
  const body = new URLSearchParams();
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  body.append("code", authorizationCode);
  body.append("grant_type", "authorization_code");
  body.append("redirect_uri", `${redirectURI}`);
  body.append("access_type", "offline");

  // access tokenを取得する
  const res = await fetch(`https://oauth2.googleapis.com/token`, {
    method: "POST",
    body,
  });
  return await res.json();
}

async function openWithRetry(
  ...args: Parameters<typeof window.open>
) {
  const retry = 5;
  const tab = window.open(...args);
  if (!tab) {
    for (let i = 0; i < retry; i++) {
      await sleep(1000);
      const tab2 = window.open(...args);
      if (tab2) return tab2;
    }
    throw Error(`Timeout: faild to open a new tab. (url: ${args[0]})`);
  }
  await Promise.resolve();
  return tab;
}
