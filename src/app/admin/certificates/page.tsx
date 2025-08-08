"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

type TemplateRow = { id: string; html_content: string | null };

export default function AdminCertificatesPage() {
  const supabase = useSupabaseClient();
  const [html, setHtml] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("id, html_content")
        .eq("id", "default")
        .maybeSingle();
      if (error) {
        console.error(error.message);
      } else {
        setHtml((data as TemplateRow)?.html_content ?? DEFAULT_HTML);
      }
      setLoading(false);
    })();
  }, [supabase]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("certificate_templates")
      .upsert({ id: "default", html_content: html }, { onConflict: "id" });
    setSaving(false);
    if (error) return alert("Save failed: " + error.message);
    alert("Saved!");
  }

  if (loading) return <p className="text-gray-600">Loading…</p>;

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-semibold">Certificate Template</h1>
      <p className="text-gray-600">
        Edit the HTML template below. You can use tokens like{" "}
        <code>{"{{name}}"}</code>, <code>{"{{course}}"}</code>,{" "}
        <code>{"{{date}}"}</code>.
      </p>

      <textarea
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        className="w-full h-80 border rounded p-3 font-mono"
      />

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Template"}
        </button>
        <button
          onClick={() => setHtml(DEFAULT_HTML)}
          className="px-4 py-2 border rounded"
        >
          Reset to default
        </button>
      </div>

      <div className="mt-8 bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-2">Preview (static)</h2>
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{
            __html: html
              .replaceAll("{{name}}", "Jane Doe")
              .replaceAll("{{course}}", "Solar Basics 101")
              .replaceAll("{{date}}", new Date().toLocaleDateString()),
          }}
        />
      </div>
    </div>
  );
}

const DEFAULT_HTML = `
  <div style="text-align:center;padding:40px;border:8px double #0ea5a3">
    <h1 style="margin:0 0 12px 0;color:#0ea5a3;">Certificate of Completion</h1>
    <p>This certifies that</p>
    <h2 style="margin:8px 0;">{{name}}</h2>
    <p>has successfully completed the course</p>
    <h3 style="margin:8px 0;">{{course}}</h3>
    <p>on {{date}}</p>
  </div>
`;
