import React, { useState, useRef, useEffect } from "react";
import { StreamResult, Stream } from "@workspace/api-client-react";
import { Maximize, Settings, Volume2, Play, Pause, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface VideoPlayerProps {
  data: StreamResult;
  activeStream: Stream;
  onStreamSelect: (stream: Stream) => void;
}

function proxyUrl(cdnUrl: string): string {
  return `${import.meta.env.BASE_URL}api/proxy?url=${encodeURIComponent(cdnUrl)}`;
}

export function VideoPlayer({ data, activeStream, onStreamSelect }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore playback position when stream changes (quality switch)
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;
    
    setError(null);
    
    // Route through our proxy so the CDN Referer check passes
    video.src = proxyUrl(activeStream.url);
    video.currentTime = currentTime;
    
    if (wasPlaying) {
      video.play().catch(err => {
        console.error("Playback interrupted after quality switch", err);
      });
    }
  }, [activeStream.id]); // specifically watch the ID to trigger only on manual switches

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const sortedStreams = [...data.streams].sort((a, b) => {
    return parseInt(b.resolutions) - parseInt(a.resolutions);
  });

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Player Container */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden ring-1 ring-white/10 box-glow group"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          poster={data.coverUrl || `${import.meta.env.BASE_URL}images/hero-bg.png`}
          controls
          controlsList="nodownload"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => setError("Failed to load video stream. It might be geo-blocked or expired.")}
        >
          <source src={proxyUrl(activeStream.url)} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-6 z-20">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Playback Error</h3>
            <p className="text-muted-foreground max-w-md">{error}</p>
          </div>
        )}
      </div>

      {/* Metadata & Controls Bar */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center p-6 bg-card rounded-2xl border border-white/5">
        <div className="flex items-center gap-6">
          {data.coverUrl && (
            <img 
              src={data.coverUrl} 
              alt={data.title} 
              className="w-20 h-28 object-cover rounded-lg shadow-lg"
            />
          )}
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {data.title || "Unknown Title"}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {(data.se > 0 || data.ep > 0) && (
                <Badge variant="glass">S{data.se} E{data.ep}</Badge>
              )}
              {data.limited && <Badge variant="destructive">Limited</Badge>}
              <span className="text-muted-foreground text-sm flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                {data.freeNum} free views left
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto p-4 bg-background rounded-xl border border-white/5">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <div className="text-sm font-medium text-muted-foreground mr-2">Quality:</div>
          <div className="flex gap-2">
            {sortedStreams.map((stream) => (
              <Button
                key={stream.id}
                size="sm"
                variant={activeStream.id === stream.id ? "default" : "glass"}
                onClick={() => onStreamSelect(stream)}
                className="font-mono text-xs"
              >
                {stream.resolutions}p
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
