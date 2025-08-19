"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import Image from "next/image";
import Link from "next/link";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

type Template = {
  id: string;
  image_url: string;
  name_x: number;
  name_y: number;
  course_x: number;
  course_y: number;
  date_x: number;
  date_y: number;
  font_size: number;
  font_color: string;
};

export default function CongratsPage({
  params: { courseId },
}: {
  params: { courseId: string };
}) {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<Template | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [issuedAt, setIssuedAt] = useState<string>("");
  const certificateRef = useRef<HTMLDivElement | null>(null);

  const firstName = useMemo(() => {
    const n =
      (session?.user?.user_metadata?.full_name as string | undefined) ||
      (session?.user?.user_metadata?.name as string | undefined) ||
      session?.user?.email?.split("@")[0] ||
      "Student";
    return n.split(" ")[0]!;
  }, [session?.user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }
      try {
        // fetch course title
        const { data: c, error: cErr } = await supabase
          .from("courses")
          .select("title")
          .eq("id", courseId)
          .maybeSingle();
        if (cErr) throw cErr;
        setCourseTitle(c?.title ?? "");

        // ensure certificate exists (issue if not)
        const res = await fetch("/api/certificates/by-course/" + courseId);
        const j = await res.json();
        if (!j?.certificate) {
          const issue = await fetch("/api/certificates/issue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ courseId }),
          });
          const jj = await issue.json();
          if (!issue.ok) throw new Error(jj?.error || "Issue failed");
        }

        // refetch cert with template
        const { data: cert, error: certErr } = await supabase
          .from("certificates")
          .select("issued_at, template_id")
          .eq("user_id", session.user.id)
          .eq("course_id", courseId)
          .maybeSingle();
        if (certErr) throw certErr;

        setIssuedAt(cert?.issued_at ?? "");

        if (cert?.template_id) {
          const { data: tmpl, error: tErr } = await supabase
            .from("certificate_templates")
            .select("*")
            .eq("id", cert.template_id)
            .maybeSingle();
          if (tErr) throw tErr;
          setTemplate(tmpl as Template);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, session?.user, supabase]);

  const onDownload = async () => {
    if (!certificateRef.current) return;
    const node = certificateRef.current;
    const dataUrl = await toPng(node, { pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `certificate_${firstName}_${courseTitle}.png`;
    a.click();
  };

  if (!session?.user) {
    return (
      <main className="max-w-3xl mx-auto p-8">
        <p>Please sign in.</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-green-700">
          Congratulations! 🎉
        </h1>
        <p className="text-gray-700">
          You’ve completed <span className="font-medium">{courseTitle}</span>.
        </p>
      </div>

      {/* Certificate Preview */}
      <section className="bg-white rounded-lg shadow p-4">
        {loading ? (
          <p className="text-gray-600">Preparing your certificate…</p>
        ) : template ? (
          <div className="w-full overflow-auto">
            <div
              ref={certificateRef}
              className="relative"
              style={{
                width: 1200, // logical canvas width (matches positions)
                height: 800, // logical canvas height (matches positions)
              }}
            >
              {/* Background template */}
              <Image
                src={template.image_url}
                alt="Certificate Template"
                fill
                className="object-cover"
                sizes="1200px"
                priority
              />
              {/* Text overlays */}
              <div
                style={{
                  position: "absolute",
                  left: template.name_x,
                  top: template.name_y,
                  fontSize: template.font_size,
                  color: template.font_color,
                  fontWeight: 700,
                }}
              >
                {firstName}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: template.course_x,
                  top: template.course_y,
                  fontSize: Math.max(template.font_size - 6, 24),
                  color: template.font_color,
                }}
              >
                {courseTitle}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: template.date_x,
                  top: template.date_y,
                  fontSize: 20,
                  color: template.font_color,
                }}
              >
                {issuedAt ? new Date(issuedAt).toLocaleDateString() : ""}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-red-600">
            No active certificate template set. Please contact admin.
          </p>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={onDownload}
          disabled={!template || loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Download Certificate
        </button>
        <Link
          href={`/courses/${courseId}`}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Back to course
        </Link>
      </div>
    </main>
  );
}
