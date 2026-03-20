import React, { useState } from "react";
import { Copy, Download, Check, PlayCircle, Film, Monitor } from "lucide-react";
import { Stream } from "@workspace/api-client-react";
import { formatBytes, formatDuration } from "@/lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface StreamCardProps {
  stream: Stream;
  isActive?: boolean;
  onPlay?: (stream: Stream) => void;
}

export function StreamCard({ stream, isActive, onPlay }: StreamCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(stream.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHD = stream.resolutions.includes('1080') || stream.resolutions.includes('720');
  const sizeValue = parseInt(stream.size, 10);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 group
        ${isActive 
          ? "bg-primary/10 border-2 border-primary box-glow" 
          : "bg-card border border-white/5 hover:border-white/15 hover:bg-white/5"}`}
    >
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between relative z-10">
        
        <div className="flex items-center gap-4">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center transition-colors
            ${isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground group-hover:text-primary'}`}>
            {isHD ? <Monitor className="w-6 h-6" /> : <Film className="w-6 h-6" />}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-display font-bold text-lg text-foreground">
                {stream.resolutions}p
              </h4>
              {isHD && <Badge variant={isActive ? "default" : "glass"}>HD</Badge>}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-mono bg-black/30 px-2 py-0.5 rounded text-xs">
                {stream.format} • {stream.codecName}
              </span>
              <span>{formatBytes(sizeValue)}</span>
              <span>{formatDuration(stream.duration)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <Button 
            variant="glass" 
            size="icon" 
            onClick={handleCopy}
            title="Copy URL"
            className="shrink-0"
          >
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
          </Button>
          
          <a 
            href={`${import.meta.env.BASE_URL}api/proxy?url=${encodeURIComponent(stream.url)}`}
            download
            className="shrink-0 block"
          >
            <Button variant="glass" size="icon" title="Download">
              <Download className="w-5 h-5" />
            </Button>
          </a>
          
          {onPlay && (
            <Button 
              variant={isActive ? "secondary" : "default"}
              className="flex-1 sm:flex-none w-full"
              onClick={() => onPlay(stream)}
              disabled={isActive}
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              {isActive ? 'Playing' : 'Play'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
