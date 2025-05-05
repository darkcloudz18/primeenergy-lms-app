// src/components/CourseCard.tsx
"use client";
import Link from "next/link";
import Image from "next/image";

interface CourseCardProps {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
}

export default function CourseCard({
  id,
  title,
  imageUrl,
  description,
}: CourseCardProps) {
  return (
    <Link
      href={`/courses/${id}`}
      className="block bg-white border border-gray-200 rounded-lg overflow-hidden shadow hover:shadow-lg transition"
    >
      <div className="relative h-48 w-full">
        <Image
          src={imageUrl || "/placeholder.png"}
          alt={title}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-4 space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
        )}
        <span className="text-green-600 font-medium">Learn More →</span>
      </div>
    </Link>
  );
}
