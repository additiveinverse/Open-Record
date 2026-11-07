// One-time local setup: signs in to OneDrive and stores the client ID and refresh token in SSM.
import { PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const clientId = process.env.CLIENT_ID;
const prefix = process.env.ONEDRIVE_PARAM_PREFIX ?? "/open-record/onedrive";
const base = "https://login.microsoftonline.com/consumers/oauth2/v2.0";
const scope = "Files.ReadWrite offline_access";

async function main() {
  if (!clientId) throw new Error("Set CLIENT_ID to the Azure app (client) ID");

  const dc = await (
    await fetch(`${base}/devicecode`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, scope }),
    })
  ).json();
  console.log(dc.message);

  const deadline = Date.now() + dc.expires_in * 1000;
  let interval = dc.interval * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));
    const res = await fetch(`${base}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: dc.device_code,
      }),
    });
    const body = await res.json();
    if (res.ok) {
      const ssm = new SSMClient({});
      for (const [name, value] of [
        ["client-id", clientId],
        ["refresh-token", body.refresh_token],
      ]) {
        await ssm.send(
          new PutParameterCommand({
            Name: `${prefix}/${name}`,
            Value: value,
            Type: "SecureString",
            Overwrite: true,
          }),
        );
      }
      console.log(`Stored credentials under ${prefix}/`);
      return;
    }
    if (body.error === "slow_down") interval += 5000;
    else if (body.error !== "authorization_pending") throw new Error(JSON.stringify(body));
  }
  throw new Error("Sign-in timed out");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
