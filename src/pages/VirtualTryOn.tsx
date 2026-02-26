import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Sparkles, Download, Camera, RefreshCw, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Progress } from "@/components/ui/progress";

const loadingMessages = [
  "Analyzing clothing details...",
  "Mapping body proportions...",
  "Adjusting fabric draping...",
  "Applying realistic shadows...",
  "Refining lighting effects...",
  "Generating final result...",
];

/** Compress a data-URL to JPEG at target quality/size for faster uploads */
async function compressImage(dataUrl: string, maxDim = 768, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not available"));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}

interface UploadZoneProps {
  label: string;
  image: string | null;
  onFile: (dataUrl: string) => void;
  onClear: () => void;
  allowCamera?: boolean;
}

const UploadZone = ({ label, image, onFile, onClear, allowCamera = true }: UploadZoneProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(reader.result as string);
        onFile(compressed);
      } catch {
        onFile(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
    // reset so same file can be reselected
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">{label}</h3>

      {image ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-[3/4]">
          <img src={image} alt={label} className="w-full h-full object-cover" />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-1.5 rounded-full shadow hover:bg-background transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-foreground" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl aspect-[3/4] flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.98]"
        >
          <ImagePlus className="h-8 w-8 mb-3 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Upload photo</span>
          {allowCamera && (
            <span className="text-xs text-muted-foreground/60 mt-1">or use camera below</span>
          )}
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" />

      {/* Action buttons */}
      {!image && (
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Upload className="h-4 w-4" />
            Gallery
          </button>
          {allowCamera && (
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-primary/50 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Camera className="h-4 w-4" />
              Camera
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const VirtualTryOn = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const navState = location.state as { clothImage?: string; clothName?: string } | null;

  const [clothImage, setClothImage] = useState<string | null>(null);
  const [modelImage, setModelImage] = useState<string | null>(null);

  // Convert nav-state image (local path or any URL) to a data URL on mount
  useEffect(() => {
    const raw = navState?.clothImage;
    if (!raw) return;
    if (raw.startsWith("data:")) { setClothImage(raw); return; }
    // Fetch the image and convert to data URL
    fetch(raw)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const compressed = await compressImage(reader.result as string);
            setClothImage(compressed);
          } catch {
            setClothImage(reader.result as string);
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => setClothImage(raw)); // fallback: keep as-is
  }, []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const { toast } = useToast();

  // Progress animation
  useEffect(() => {
    if (!isProcessing) {
      setProgress(0);
      setLoadingMessage(loadingMessages[0]);
      return;
    }
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return Math.min(prev + Math.random() * 8 + 2, 95);
      });
    }, 500);
    const messageInterval = setInterval(() => {
      setLoadingMessage((prev) => {
        const i = loadingMessages.indexOf(prev);
        return loadingMessages[(i + 1) % loadingMessages.length];
      });
    }, 2500);
    return () => { clearInterval(progressInterval); clearInterval(messageInterval); };
  }, [isProcessing]);

  const handleTryOn = async () => {
    if (!clothImage || !modelImage) return;
    if (!user) {
      toast({ title: "Login required", description: "Please log in to use virtual try-on.", variant: "destructive" });
      navigate("/login", { state: { from: "/try-on" } });
      return;
    }
    setIsProcessing(true);
    setResult(null);
    setLastError(null);
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke("virtual-tryon", {
        body: { clothImage, modelImage },
      });
      if (error) throw error;
      setProgress(100);
      if (data?.image) {
        if (data.image === clothImage || data.image === modelImage) {
          throw new Error("Try-on failed (the AI returned an input image). Please try a clearer photo.");
        }
        setResult(data.image);
        toast({ title: "Success!", description: "Virtual try-on completed." });
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error("No image was generated. Please try again.");
      }
    } catch (error: any) {
      const status = error?.context?.status ?? error?.status;
      let backendMsg: string | undefined;
      let retryAfterSeconds: number | undefined;
      const bodyText = error?.context?.body;
      if (typeof bodyText === "string") {
        try {
          const parsed = JSON.parse(bodyText);
          if (typeof parsed?.error === "string") backendMsg = parsed.error;
          if (typeof parsed?.retryAfterSeconds === "number") retryAfterSeconds = parsed.retryAfterSeconds;
        } catch { /* ignore */ }
      }
      const retryHint = retryAfterSeconds ? ` Try again in ~${retryAfterSeconds}s.` : "";
      const message =
        status === 429 ? (backendMsg ? `${backendMsg}${retryHint}` : `Too many requests. Try again later.${retryHint}`)
        : status === 401 ? "Please log in to use virtual try-on."
        : backendMsg || error?.message || "Failed to process. Please try again.";
      setLastError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const ready = !!clothImage && !!modelImage && !isProcessing;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </Link>
          <h1 className="text-base font-semibold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            Virtual Try-On
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Subtitle */}
        <p className="text-center text-sm text-muted-foreground">
          Upload a garment photo &amp; your photo — AI will dress you in seconds.
        </p>

        {/* Upload grid */}
        <div className="grid grid-cols-2 gap-4">
          <UploadZone
            label="Garment"
            image={clothImage}
            onFile={setClothImage}
            onClear={() => setClothImage(null)}
            allowCamera={false}
          />
          <UploadZone
            label="Your Photo"
            image={modelImage}
            onFile={setModelImage}
            onClear={() => setModelImage(null)}
            allowCamera={true}
          />
        </div>

        {/* Tips */}
        <div className="bg-muted/50 rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm mb-1">💡 Tips for best results</p>
          <p>• Use a clear, front-facing garment image on a plain background</p>
          <p>• Use a full-body or upper-body photo with good lighting</p>
          <p>• Images are compressed automatically for faster processing</p>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleTryOn}
          disabled={!ready}
          className="w-full h-14 text-base font-semibold rounded-xl shadow-lg"
        >
          {isProcessing ? (
            <>
              <Sparkles className="mr-2 h-5 w-5 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Try it on — AI Magic
            </>
          )}
        </Button>

        {/* Processing state */}
        {isProcessing && (
          <div className="bg-muted rounded-xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-center">
              <div className="relative w-16 h-16">
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
                  <Sparkles className="w-4 h-4 text-primary/40 absolute top-0 left-1/2 -translate-x-1/2" />
                  <Sparkles className="w-4 h-4 text-primary/40 absolute bottom-0 left-1/2 -translate-x-1/2" />
                  <Sparkles className="w-4 h-4 text-primary/40 absolute left-0 top-1/2 -translate-y-1/2" />
                  <Sparkles className="w-4 h-4 text-primary/40 absolute right-0 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
            <p className="text-center text-sm font-medium animate-pulse">{loadingMessage}</p>
            <Progress value={progress} className="h-2" />
            <p className="text-center text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
          </div>
        )}

        {/* Result */}
        {!isProcessing && result && (
          <div className="space-y-3 animate-fade-in">
            <h2 className="text-center font-semibold text-lg">Your Result ✨</h2>
            <div className="rounded-xl overflow-hidden border border-border shadow-lg">
              <img src={result} alt="Try-on result" className="w-full object-contain" />
            </div>
            <a
              href={result}
              download="virtual-tryon-result.jpg"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-primary text-primary font-medium hover:bg-primary/10 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Result
            </a>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setResult(null); setModelImage(null); setClothImage(null); }}
            >
              Try Another
            </Button>
          </div>
        )}

        {/* Error */}
        {!isProcessing && !result && lastError && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 animate-fade-in">
            <p className="font-medium text-sm text-destructive">Could not generate result</p>
            <p className="mt-1 text-xs text-muted-foreground">{lastError}</p>
          </div>
        )}

        {/* Empty placeholder */}
        {!isProcessing && !result && !lastError && (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
            Your try-on result will appear here
          </div>
        )}
      </main>
    </div>
  );
};

export default VirtualTryOn;
