export function openAuthWindow(
  { clientId, redirectURI = "http://localhost:8080", scopes } = {},
) {
  window.open(
    `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectURI}&access_type=offline&scope=${
      scopes.join("%20")
    }`,
  );
}

export async function getTokens(
  {
    clientId,
    clientSecret,
    authorizationCode,
    redirectURI = "http://localhost:8080",
  },
) {
  // parametersを組み立てる
  const body = new URLSearchParams();
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  body.append("code", authorizationCode);
  body.append("grant_type", "authorization_code");
  body.append("redirect_uri", redirectURI);
  body.append("access_type", "offline");

  // access tokenを取得する
  const res = await fetch(`https://oauth2.googleapis.com/token`, {
    method: "POST",
    body,
  });
  return await res.json();
}

export async function getAuthToken({ clientId, clientSecret, scopes }) {
  const redirectURI = "https://scrapbox.io";
  const popup = window.open(
    `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectURI}&scope=${
      scopes.join("%20")
    }`,
  );

  const pending = new Promise((resolve, reject) => {
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
