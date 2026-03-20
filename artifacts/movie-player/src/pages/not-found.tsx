import { Link } from "wouter";
import { Film, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden text-center px-4">
      {/* Ambient background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-background z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full z-0 opacity-50" />
      </div>

      <div className="relative z-10 space-y-8 max-w-lg mx-auto">
        <div className="w-24 h-24 bg-card border border-white/10 rounded-3xl mx-auto flex items-center justify-center shadow-2xl rotate-12 mb-8">
          <Film className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter text-foreground">
          404
        </h1>
        
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Scene Missing</h2>
          <p className="text-lg text-muted-foreground">
            The page you are looking for has been cut from the final edit.
          </p>
        </div>

        <div className="pt-8">
          <Link href="/" className="inline-block">
            <Button size="lg" className="rounded-xl">
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
