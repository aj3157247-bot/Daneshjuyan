export async function onRequestGet({ env }) {
  const checks = {
    app: "daneshjuyan",
    status: "ok",
    databaseConfigured: Boolean(env.DB),
    storageConfigured: Boolean(env.FILES),
    timestamp: new Date().toISOString()
  };

  if (env.DB) {
    try {
      await env.DB.prepare("SELECT 1").first();
      checks.databaseStatus = "connected";
    } catch (error) {
      checks.databaseStatus = "error";
      checks.databaseMessage = "D1 binding exists but database query failed.";
    }
  } else {
    checks.databaseStatus = "not_configured";
  }

  return Response.json(checks, {
    headers: { "Cache-Control": "no-store" }
  });
}
