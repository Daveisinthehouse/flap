export default {
 async fetch(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = "https://daveisinthehouse.github.io";
  const cors = { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
  const json = (data, status=200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" } });
  if (origin && origin !== allowed) return json({ error:"Origin not allowed" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { headers: { ...cors, "Access-Control-Max-Age":"86400" } });
  if (new URL(request.url).pathname !== "/scores") return json({ error:"Not found" },404);
  if (request.method === "GET") {
   const { results=[] } = await env.SCORES.prepare("SELECT name, score FROM scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 5").all();
   return json({ scores: results });
  }
  if (request.method !== "POST") return json({ error:"Method not allowed" },405);
  let body;
  try { body = await request.json(); } catch { return json({ error:"Invalid JSON" },400); }
  const name = typeof body.name === "string" ? body.name.trim().replace(/[<>\u0000-\u001f\u007f]/g, "").slice(0,20) : "";
  const score = Number(body.score);
  if (!name || !Number.isSafeInteger(score) || score < 0 || score > 1000000) return json({ error:"Enter a name and a valid score" },400);
  await env.SCORES.batch([
   env.SCORES.prepare("INSERT INTO scores (name, score) VALUES (?, ?)").bind(name,score),
   env.SCORES.prepare("DELETE FROM scores WHERE id NOT IN (SELECT id FROM scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 5)")
  ]);
  const { results=[] } = await env.SCORES.prepare("SELECT name, score FROM scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 5").all();
  return json({ scores: results });
 }
};