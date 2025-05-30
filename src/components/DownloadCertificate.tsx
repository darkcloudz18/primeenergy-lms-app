// src/components/DownloadCertificate.tsx
"use client";

import { useState, useEffect } from "react";

interface Props {
  attemptId: string;
}

export default function DownloadCertificate({ attemptId }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCert() {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/certificate`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "No certificate");
        setUrl(json.url);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchCert();
  }, [attemptId]);

  if (loading) return <p>Checking certificate…</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!url) return <p>No certificate available.</p>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
    >
      📄 Download Certificate
    </a>
  );
}
