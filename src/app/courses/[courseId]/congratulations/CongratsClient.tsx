// src/app/courses/[courseId]/congratulations/CongratsClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ----------------------------- types ----------------------------- */

type ActiveTemplate = {
  id: string;
  name: string;
  image_url: string;
  name_x: number; name_y: number;
  course_x: number; course_y: number;
  date_x: number; date_y: number;
  font_size: number; font_color: string;
  is_active: boolean;
};

async function fetchDisplayNameFromApi(): Promise<string> {
  const res = await fetch("/api/users/me/display-name", {
    credentials: "include",
    cache: "no-store",
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || "Failed to load name");
  return j.displayName as string;
}

/* The template was measured on a base 1200x800 image */
const BASE_W = 1200;
const BASE_H = 800;

/* ---------------------- certificate preview ---------------------- */

function CertificatePreview({
  template,
  learnerName,
  courseTitle,
  dateText,
  containerRef,
}: {
  template: ActiveTemplate | null;
  learnerName: string;
  courseTitle: string;
  dateText: string;
  // Allow nullable ref here ✅
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  if (!template) {
    return (
      <p className="text-center text-sm text-gray-500 my-3">
        (No active certificate template found.)
      </p>
    );
  }

  // Use a local fallback if no ref is provided
  const localRef = useRef<HTMLDivElement | null>(null);
  const hostRef = containerRef ?? localRef; // ✅ type-safe

  // helpers now use hostRef.current?. safely
  const px = (n: number) => {
    const h = hostRef.current?.getBoundingClientRect().height ?? 0;
    const scale = h / BASE_H;
    return n * scale;
  };
  const topPct = (y: number) => `${(y / BASE_H) * 100}%`;

  return (
    <div
      ref={hostRef}
      className="relative w-full max-w-4xl mx-auto aspect-[3/2] rounded-xl overflow-hidden border bg-white"
    >
      {/* Use plain <img> so html2canvas captures 1:1 */}
      <img
        src={template.image_url}
        alt={template.name}
        crossOrigin="anonymous"
        decoding="sync"
        loading="eager"
        className="absolute inset-0 h-full w-full object-fill select-none pointer-events-none"
      />

      {/* Name — centered horizontally */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: topPct(template.name_y),
          transform: "translate(-50%, -50%)",
          width: "80%",
          color: template.font_color,
          fontSize: `${px(template.font_size)}px`,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.15,
          whiteSpace: "normal",
        }}
      >
        {learnerName}
      </div>

      {/* Course — centered horizontally */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: topPct(template.course_y),
          transform: "translate(-50%, -50%)",
          width: "86%",
          color: template.font_color,
          fontSize: `${px(Math.max(template.font_size - 16, 28))}px`,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.2,
          whiteSpace: "normal",
        }}
      >
        {courseTitle}
      </div>

      {/* Date — centered horizontally */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: topPct(template.date_y),
          transform: "translate(-50%, -50%)",
          color: template.font_color,
          fontSize: `${px(24)}px`,
          fontWeight: 500,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {dateText}
      </div>
    </div>
  );
}

/* ------------------------------ page UI ------------------------------ */

export default function CongratsClient({
  template,
  initialName,
  courseTitle,
  dateText,
  courseId,
  certificateUrl,
}: {
  template: ActiveTemplate | null;
  initialName: string;
  courseTitle: string;
  dateText: string;
  courseId: string;
  certificateUrl?: string | null;
}) {
  const [name, setName] = useState(initialName || "Learner");
  const certRef = useRef<HTMLDivElement>(null);

  // Ensure we use the same display name logic as FinalQuiz
  useEffect(() => {
    fetchDisplayNameFromApi()
      .then((n) => n && setName(n))
      .catch(() => {});
  }, []);

  const snapshot = async (): Promise<HTMLCanvasElement | null> => {
    const el = certRef.current;
    if (!el) return null;

    // Wait for fonts to be ready so text size matches
    // (Safari/WebKit sometimes needs this)
    // @ts-ignore
    if (document.fonts?.ready) {
      try {
        // @ts-ignore
        await document.fonts.ready;
      } catch {}
    }

    return html2canvas(el, {
      backgroundColor: "#ffffff",
      useCORS: true,
      scale: Math.max(window.devicePixelRatio || 1, 2),
      logging: false,
    });
  };

  const downloadPNG = async () => {
    const canvas = await snapshot();
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = "certificate.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const downloadPDF = async () => {
    const canvas = await snapshot();
    if (!canvas) return;

    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape", "pt", "a4");
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const r = Math.min(pw / canvas.width, ph / canvas.height);
    const w = canvas.width * r;
    const h = canvas.height * r;
    const x = (pw - w) / 2;
    const y = (ph - h) / 2;
    pdf.addImage(img, "PNG", x, y, w, h);
    pdf.save("certificate.pdf");
  };

  return (
    <div className="p-6 bg-white rounded shadow space-y-6">
      <p className="text-2xl font-semibold text-green-700">
        🎉 Congratulations{name ? `, ${name}` : ""}!
      </p>
      <p className="text-gray-700">
        You successfully completed <b>{courseTitle}</b>.
      </p>

      <CertificatePreview
        template={template}
        learnerName={name || "Learner"}
        courseTitle={courseTitle || "Course"}
        dateText={dateText}
        containerRef={certRef}
      />

      <div className="flex flex-wrap gap-3">
        <button
          onClick={downloadPDF}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Download PDF
        </button>
        <button
          onClick={downloadPNG}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-black"
        >
          Download PNG
        </button>
        {certificateUrl ? (
          <a
            href={certificateUrl}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            download
          >
            Download (server)
          </a>
        ) : null}
        <Link
          href={`/courses/${courseId}`}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Course
        </Link>
      </div>
    </div>
  );
}