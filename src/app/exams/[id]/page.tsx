"use client";

import { use } from "react";
import ExamRunner from "@/components/exams/ExamRunner";

export default function ExamTakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ExamRunner examId={id} />;
}
