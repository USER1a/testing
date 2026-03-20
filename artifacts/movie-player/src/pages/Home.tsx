import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Film, Tv, PlaySquare, AlertTriangle } from "lucide-react";
import { useGetStreams, Stream } from "@workspace/api-client-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/VideoPlayer";
import { StreamCard } from "@/components/StreamCard";

export default function Home() {
  const [urlInput, setUrlInput] = useState("");
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [activeStream, setActiveStream] = useState<Stream | null>(null);

  // Auto-load if `?url=<movieboxUrl>` is present in the browser URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preload = params.get("url");
    if (preload) {
      setUrlInput(preload);
      setActiveUrl(preload);
    }
  }, []);

  const { data, isLoading, error } = useGetStreams(
    { url: activeUrl || "" },
    { 
      query: { 
        enabled: !!activeUrl,
        retry: false,
        staleTime: 0,
        gcTime: 0,
      } 
    }
  );

  // Auto-select best stream when data arrives
  useEffect(() => {
    if (data?.success && data.streams.length > 0) {
      const best = data.streams.find(s => s.resolutions === '1080') || 
                   data.streams.find(s => s.resolutions === '720') || 
                   data.streams[0];
      setActiveStream(best);
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setActiveUrl(urlInput.trim());
    setActiveStream(null);
  };

  const isInitialState = !activeUrl && !isLoading && !data && !error;
  const isError = error || (data && !data.success);

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center">
      {/* Dynamic Background */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute inset-0 bg-background/90 z-10" />
        <img 
          src={data?.coverUrl || `${import.meta.env.BASE_URL}images/hero-bg.png`}
          alt=""
          className="w-full h-full object-cover opacity-30 blur-3xl scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 min-h-screen flex flex-col">
        
        {/* Header / Search Form */}
        <motion.div 
          layout
          initial={false}
          animate={{
            y: isInitialState ? "30vh" : 0,
            scale: isInitialState ? 1.05 : 1
          }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
          className="w-full flex flex-col items-center justify-center max-w-3xl mx-auto z-20"
        >
          {isInitialState && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10 space-y-4"
            >
              <div className="inline-flex items-center justify-center p-3 bg-primary/20 rounded-2xl mb-4 text-primary box-glow">
                <PlaySquare className="w-10 h-10" />
              </div>
              <h1 className="text-5xl md:text-6xl font-display font-extrabold text-foreground tracking-tight text-glow">
                Cinematic Streams
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Paste any themoviebox.org URL below to instantly extract high-quality raw stream links for your native player.
              </p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="w-full relative group">
            <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/50 to-purple-600/50 blur opacity-20 group-hover:opacity-40 transition duration-500 ${isInitialState ? 'opacity-40 blur-xl' : 'opacity-0'}`} />
            <div className="relative flex items-center gap-3 bg-card p-2 rounded-2xl border border-white/10 shadow-2xl">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://themoviebox.org/movies/..."
                leftIcon={<Search className="w-5 h-5 text-muted-foreground" />}
                className="border-none bg-transparent h-14 focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
              />
              <Button type="submit" size="lg" isLoading={isLoading} className="rounded-xl h-14 px-8 shrink-0">
                Get Streams
              </Button>
            </div>
          </form>
        </motion.div>

        {/* Results Area */}
        <AnimatePresence mode="wait">
          {!isInitialState && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="w-full flex-1 mt-12 space-y-12"
            >
              
              {/* Loading State */}
              {isLoading && (
                <div className="space-y-8 w-full max-w-5xl mx-auto">
                  <Skeleton className="w-full aspect-video rounded-3xl" />
                  <div className="flex gap-6">
                    <Skeleton className="w-24 h-32 rounded-lg shrink-0" />
                    <div className="space-y-4 flex-1 py-2">
                      <Skeleton className="h-8 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-12 w-full mt-4" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {isError && (
                <div className="w-full max-w-2xl mx-auto bg-destructive/10 border border-destructive/20 rounded-3xl p-10 text-center space-y-6 box-glow">
                  <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Failed to Extract Streams</h3>
                    <p className="text-muted-foreground">
                      {(error as any)?.error || (data as any)?.error || "Invalid URL or the movie has no available resources right now."}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setActiveUrl(null)}>Try Another URL</Button>
                </div>
              )}

              {/* Success State */}
              {data?.success && activeStream && (
                <div className="w-full flex flex-col xl:flex-row gap-10">
                  
                  {/* Left Column: Player & Meta */}
                  <div className="flex-1 space-y-10 min-w-0">
                    <VideoPlayer 
                      data={data} 
                      activeStream={activeStream} 
                      onStreamSelect={setActiveStream} 
                    />
                  </div>

                  {/* Right Column: Streams List */}
                  <div className="w-full xl:w-[400px] shrink-0 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                        <Tv className="w-5 h-5 text-primary" />
                        Available Streams
                      </h3>
                      <div className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-muted-foreground border border-white/10">
                        {data.streams.length} files
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {data.streams.map((stream) => (
                        <StreamCard
                          key={stream.id}
                          stream={stream}
                          isActive={activeStream.id === stream.id}
                          onPlay={setActiveStream}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
