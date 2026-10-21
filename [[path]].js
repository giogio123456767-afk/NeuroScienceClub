// Single router for all /api/* routes (Cloudflare Pages Functions)
// Bindings: DB (D1), BUCKET (R2). Secret: ADMIN_PASSWORD (falls back to N3UR0).
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const MAX = 20 * 1024 * 1024;
const EXT = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

function isAdmin(req, env, url) {
  const given = req.headers.get("x-admin-password") || url.searchParams.get("k") || "";
  const real = env.ADMIN_PASSWORD || "N3UR0";
  let diff = given.length ^ real.length;                       // constant-time compare
  for (let i = 0; i < real.length; i++) diff |= (given.charCodeAt(i) || 0) ^ real.charCodeAt(i);
  return diff === 0;
}
const clean = (v, n) => String(v ?? "").trim().slice(0, n);

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const [route, arg] = [].concat(params.path || []);
  const m = request.method;

  try {
    // Public: approved papers
    if (route === "papers" && m === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT id,school,author,coauthors,title,link,file_name,created FROM papers WHERE status='approved' ORDER BY created DESC").all();
      return J(results);
    }

    // Public: submit
    if (route === "submit" && m === "POST") {
      const f = await request.formData();
      if (f.get("website")) return J({ ok: true });            // honeypot
      const school = clean(f.get("school"), 150), author = clean(f.get("author"), 120), title = clean(f.get("title"), 250);
      const coauthors = clean(f.get("coauthors"), 300), email = clean(f.get("email"), 150);
      let link = clean(f.get("link"), 500);
      if (!school || !author || !title) return J({ error: "School, author and title are required." }, 400);
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return J({ error: "Invalid email." }, 400);
      if (link && !/^https:\/\/(docs|drive)\.google\.com\//.test(link)) return J({ error: "Link must be a Google Docs/Drive URL." }, 400);
      const file = f.get("file"), id = crypto.randomUUID();
      let key = null, fname = null;
      if (file && file.size) {
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if (!EXT[ext]) return J({ error: "Upload a PDF, DOC or DOCX file." }, 400);
        if (file.size > MAX) return J({ error: "File is over 20 MB." }, 400);
        key = `${id}.${ext}`; fname = clean(file.name, 120);
        await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: EXT[ext] } });
      }
      if (!key && !link) return J({ error: "Upload a file or paste a Google Doc link." }, 400);
      await env.DB.prepare("INSERT INTO papers (id,school,author,coauthors,email,title,link,file_key,file_name,status,created) VALUES (?,?,?,?,?,?,?,?,?,'pending',?)")
        .bind(id, school, author, coauthors, email, title, link || null, key, fname, Date.now()).run();
      return J({ ok: true });
    }

    // File download: approved = public, otherwise admin only
    if (route === "file" && m === "GET" && arg) {
      const row = await env.DB.prepare("SELECT status,file_key,file_name FROM papers WHERE id=?").bind(arg).first();
      if (!row || !row.file_key || (row.status !== "approved" && !isAdmin(request, env, url))) return J({ error: "Not found" }, 404);
      const obj = await env.BUCKET.get(row.file_key);
      if (!obj) return J({ error: "Not found" }, 404);
      const ext = row.file_key.split(".").pop();
      const safe = row.file_name.replace(/[^\w.\- ]/g, "_");
      return new Response(obj.body, { headers: {
        "content-type": EXT[ext], "x-content-type-options": "nosniff",
        "content-disposition": `${ext === "pdf" ? "inline" : "attachment"}; filename="${safe}"`,
        "cache-control": row.status === "approved" ? "public, max-age=3600" : "no-store" } });
    }

    // Admin actions
    if (route === "admin" && m === "POST") {
      if (!isAdmin(request, env, url)) return J({ error: "Unauthorized" }, 401);
      const { action, id } = await request.json();
      if (action === "list") {
        const { results } = await env.DB.prepare("SELECT id,school,author,coauthors,email,title,link,file_name,status,created FROM papers ORDER BY created DESC").all();
        return J(results);
      }
      if (action === "approve" || action === "unpublish") {
        await env.DB.prepare("UPDATE papers SET status=? WHERE id=?").bind(action === "approve" ? "approved" : "pending", id).run();
        return J({ ok: true });
      }
      if (action === "delete") {
        const row = await env.DB.prepare("SELECT file_key FROM papers WHERE id=?").bind(id).first();
        if (row?.file_key) await env.BUCKET.delete(row.file_key);
        await env.DB.prepare("DELETE FROM papers WHERE id=?").bind(id).run();
        return J({ ok: true });
      }
    }
    return J({ error: "Not found" }, 404);
  } catch (e) {
    return J({ error: "Server error" }, 500);
  }
}
