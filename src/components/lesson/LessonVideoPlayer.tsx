"use client";

import { useCallback, useRef } from "react";

const SYNC_INTERVAL_SECONDS = 10;

interface LessonVideoPlayerProps {
  lessonId: string;
  videoUrl: string;
  title: string;
  initialResumeSeconds: number;
  enabled: boolean;
}

export default function LessonVideoPlayer({
  lessonId,
  videoUrl,
  title,
  initialResumeSeconds,
  enabled,
}: LessonVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedTimeRef = useRef<number>(initialResumeSeconds);
  const restoredRef = useRef<boolean>(false);

  const saveProgress = useCallback(
    (time: number) => {
      if (!enabled || !Number.isFinite(time) || time < 0) return;
      lastSavedTimeRef.current = time;
      void fetch(`/api/lessons/${lessonId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeSeconds: Math.floor(time) }),
        keepalive: true,
      }).catch(() => undefined);
    },
    [enabled, lessonId],
  );

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || restoredRef.current) return;
    restoredRef.current = true;
    if (initialResumeSeconds > 0) {
      video.currentTime = initialResumeSeconds;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - lastSavedTimeRef.current) >= SYNC_INTERVAL_SECONDS) {
      saveProgress(video.currentTime);
    }
  };

  const handlePause = () => {
    const video = videoRef.current;
    if (video) saveProgress(video.currentTime);
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (video) saveProgress(video.currentTime);
  };

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      title={title}
      className="w-full h-full"
      controls
      preload="metadata"
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      onPause={handlePause}
      onEnded={handleEnded}
    />
  );
}
