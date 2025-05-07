// src/app/demo/certificate/page.tsx
import Image from "next/image";

export default function DemoCertificatePage() {
  return (
    <div className="max-w-4xl mx-auto py-12 text-center">
      <h2 className="text-3xl font-bold mb-8 text-black">Congratulations!</h2>
      <div className="inline-block p-6 bg-white rounded shadow-lg">
        {/* Container sizing */}
        <div className="relative w-full h-[400px] rounded-md overflow-hidden shadow">
          <Image
            src="/demo-certificate.jpg"
            alt="Certificate of Completion"
            fill
            className="object-cover"
            priority
          />
        </div>
        <p className="mt-4 text-gray-700">
          You’ve successfully completed “Reducing Radiated Emissions in Solar PV
          Systems.”
        </p>
      </div>
    </div>
  );
}
