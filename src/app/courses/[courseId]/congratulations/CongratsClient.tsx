"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

function CertificatePreview({
  template, learnerName, courseTitle, dateText, containerRef,
}: {
  template: ActiveTemplate | null;
  learnerName: string;
  courseTitle: string;
  dateText: string;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  if (!template) {
    return <p className="text-center text-sm text-gray-500 my-3">(No active certificate template found.)</p>;
  }
  const baseH = 800;
  return (
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto aspect-[3/2] rounded-xl overflow-hidden border bg-white">
      <Image src={template.image_url} alt={template.name} fill className="object-cover" priority />
      {/* Name */}
      <div style={{
        position: "absolute", left: "50%", top: `${(template.name_y / baseH) * 100}%`,
        transform: "translate(-50%, -50%)", width: "80%", color: template.font_color,
        fontSize: `${template.font_size / 2}px`, fontWeight: 700, textAlign: "center", lineHeight: 1.2,
      }}>{learnerName}</div>
      {/* Course */}
      <div style={{
        position: "absolute", left: "50%", top: `${(template.course_y / baseH) * 100}%`,
        transform: "translate(-50%, -50%)", width: "80%", color: template.font_color,
        fontSize: `${Math.max(template.font_size - 6, 24) / 2}px`, fontWeight: 500, textAlign: "center",
      }}>{courseTitle}</div>
      {/* Date */}
      <div style={{
        position: "absolute", left: "50%", top: `${(template.date_y / baseH) * 100}%`,
        transform: "translate(-50%, -50%)", color: template.font_color, fontSize: `${20 / 2}px`,
        textAlign: "center", whiteSpace: "nowrap",
      }}>{dateText}</div>
    </div>
  );
}

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
  const certRef = useRef<HTMLDivElement>(null!);

  // ✅ match FinalQuiz: override with API name on mount
  useEffect(() => {
    fetchDisplayNameFromApi()
      .then((n) => n && setName(n))
      .catch(() => {});
  }, []);

  const downloadPNG = () => {
    const el = certRef.current; if (!el) return;
    html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true }).then((canvas) => {
      const a = document.createElement("a");
      a.download = "certificate.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    });
  };

  const downloadPDF = () => {
    const el = certRef.current; if (!el) return;
    html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true }).then((canvas) => {
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "pt", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const r = Math.min(pw / canvas.width, ph / canvas.height);
      const w = canvas.width * r, h = canvas.height * r;
      const x = (pw - w) / 2, y = (ph - h) / 2;
      pdf.addImage(img, "PNG", x, y, w, h);
      pdf.save("certificate.pdf");
    });
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
        <button onClick={downloadPDF} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Download PDF
        </button>
        <button onClick={downloadPNG} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-black">
          Download PNG
        </button>
        {certificateUrl ? (
          <a href={certificateUrl} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700" download>
            Download (server)
          </a>
        ) : null}
        <Link href={`/courses/${courseId}`} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Back to Course
        </Link>
      </div>
    </div>
  );
}