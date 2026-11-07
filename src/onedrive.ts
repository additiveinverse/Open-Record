import { GetParameterCommand, PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const TOKEN_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const SCOPE = "Files.ReadWrite offline_access";

const ssm = new SSMClient({});
const prefix = () => process.env.ONEDRIVE_PARAM_PREFIX ?? "/open-record/onedrive";

let cached: { token: string; expiresAt: number } | undefined;

async function getParam(name: string): Promise<string> {
  const out = await ssm.send(
    new GetParameterCommand({ Name: `${prefix()}/${name}`, WithDecryption: true }),
  );
  return out.Parameter!.Value!;
}

async function putParam(name: string, value: string): Promise<void> {
  await ssm.send(
    new PutParameterCommand({
      Name: `${prefix()}/${name}`,
      Value: value,
      Type: "SecureString",
      Overwrite: true,
    }),
  );
}

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const [clientId, refreshToken] = await Promise.all([
    getParam("client-id"),
    getParam("refresh-token"),
  ]);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: SCOPE,
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  // Microsoft rotates refresh tokens; losing the new one would lock us out.
  if (body.refresh_token && body.refresh_token !== refreshToken) {
    await putParam("refresh-token", body.refresh_token);
  }
  cached = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cached.token;
}

export async function uploadRecord(path: string, content: string): Promise<void> {
  const token = await accessToken();
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encoded}:/content?@microsoft.graph.conflictBehavior=rename`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/markdown" },
    body: content,
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
}

export function resetTokenCache(): void {
  cached = undefined;
}
