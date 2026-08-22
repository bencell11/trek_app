"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TrekIndexPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/treks/${id}/carte`);
  }, [id, router]);

  return null;
}
