/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />

import { getAuthToken, GetAuthTokenProps } from "./token.ts";
let _auth: GetAuthTokenProps | undefined;
let accessTokenInfo: {
  expiresIn: number;
  accessToken: string;
} | undefined = undefined;

export type InitProps = GetAuthTokenProps;

export function init(auth: InitProps) {
  _auth = auth;
}

/** Google APIを叩く
 *
 * @param pathname 叩きたいGoogle APIのURLの`https://www.googleapis.com`以降の部分
 * @param options `fetch()`に渡すrequest option
 */
export async function exec(pathname: string, options?: RequestInit) {
  const { headers, ...rest } = options ?? {};
  return await fetch(`https://www.googleapis.com${pathname}`, {
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...headers,
    },
    ...rest,
  });
}

/** Google APIのAccess Tokenを取得する
 *
 * 有効期限が1分前になったら新しいAccess Tokenを発行する
 */
async function accessToken() {
  // 有効期限の1分前になったら更新する
  if (
    !accessTokenInfo ||
    (accessTokenInfo.expiresIn ?? 0) - new Date().getTime() < 1000 * 60
  ) {
    if (!_auth) {
      throw Error(
        'Authorization code is not set yet. Please execute "init()" before calling this function',
      );
    }
    // deno-lint-ignore camelcase
    const { access_token, expires_in } = await getAuthToken(_auth);
    accessTokenInfo = {
      expiresIn: new Date().getTime() + expires_in * 1000,
      accessToken: access_token,
    };
  } else {
    await Promise.resolve();
  }
  return accessTokenInfo.accessToken;
}