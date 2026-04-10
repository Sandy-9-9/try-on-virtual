import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Sparkles, Download, Camera, RefreshCw, ImagePlus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const loadingMessages = [
  "Analyzing clothing details...",
  "Mapping body proportions...",
  "Adjusting fabric draping...",
  "Applying realistic shadows...",
  "Refining lighting effects...",
  "Generating final result...",
];

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

interface GarmentSlot {
  id: string;
  label: string;
  image: string | null;
}

interface UploadZoneProps {
  label: string;
  image: string | null;
  onFile: (dataUrl: string) => void;
  onClear: () => void;
  allowCamera?: boolean;
  onRemoveSlot?: () => void;
  canRemove?: boolean;
}

const UploadZone = ({ label, image, onFile, onClear, allowCamera = true, onRemoveSlot, canRemove }: UploadZoneProps) => {
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
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-1">
        <h3 className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">{label}</h3>
        {canRemove && onRemoveSlot && (
          <button onClick={onRemoveSlot} className="p-0.5 rounded-full hover:bg-destructive/10 transition-colors">
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        )}
      </div>

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

      <input ref={fileRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" />

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

let slotCounter = 0;
const makeSlot = (label: string, image: string | null = null): GarmentSlot => ({
  id: `slot-${++slotCounter}`,
  label,
  image,
});

const VirtualTryOn = () => {
  const location = useLocation();
  const navState = location.state as { clothImage?: string; clothName?: string } | null;

  const [garmentSlots, setGarmentSlots] = useState<GarmentSlot[]>([
    makeSlot("Shirt / Top"),
  ]);
  const [modelImage, setModelImage] = useState<string | null>(null);

  // Convert nav-state image on mount
  useEffect(() => {
    const raw = navState?.clothImage;
    if (!raw) return;
    const processImage = async (dataUrl: string) => {
      try {
        return await compressImage(dataUrl);
      } catch {
        return dataUrl;
      }
    };

    if (raw.startsWith("data:")) {
      processImage(raw).then((compressed) => {
        setGarmentSlots((prev) => {
          const next = [...prev];
          next[0] = { ...next[0], image: compressed };
          return next;
        });
      });
      return;
    }

    fetch(raw)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const compressed = await processImage(reader.result as string);
          setGarmentSlots((prev) => {
            const next = [...prev];
            next[0] = { ...next[0], image: compressed };
            return next;
          });
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        setGarmentSlots((prev) => {
          const next = [...prev];
          next[0] = { ...next[0], image: raw };
          return next;
        });
      });
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

  const addGarmentSlot = () => {
    if (garmentSlots.length >= 3) return;
    const labels = ["Pants / Bottom", "Accessory / Layer"];
    const label = labels[garmentSlots.length - 1] || `Garment ${garmentSlots.length + 1}`;
    setGarmentSlots((prev) => [...prev, makeSlot(label)]);
  };

  const removeGarmentSlot = (id: string) => {
    setGarmentSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const setGarmentImage = (id: string, image: string | null) => {
    setGarmentSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, image } : s))
    );
  };

  const clothImages = garmentSlots.filter((s) => s.image).map((s) => s.image!);
  const hasAnyGarment = clothImages.length > 0;
  const ready = hasAnyGarment && !!modelImage && !isProcessing;

  const handleTryOn = async () => {
    if (!hasAnyGarment || !modelImage) return;
    setIsProcessing(true);
    setResult(null);
    setLastError(null);
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke("virtual-tryon", {
        body: { clothImages, modelImage },
      });
      if (error) throw error;
      setProgress(100);
      if (data?.image) {
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

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
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
        <p className="text-center text-sm text-muted-foreground">
          Upload garment photos (shirt, pants, etc.) &amp; your photo — AI will dress you in seconds.
        </p>

        {/* Garment slots */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Garments</span>
            {garmentSlots.length < 3 && (
              <button
                onClick={addGarmentSlot}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add garment
              </button>
            )}
          </div>
          <div className={`grid gap-4 ${garmentSlots.length === 1 ? "grid-cols-2" : garmentSlots.length === 2 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
            {garmentSlots.map((slot) => (
              <UploadZone
                key={slot.id}
                label={slot.label}
                image={slot.image}
                onFile={(img) => setGarmentImage(slot.id, img)}
                onClear={() => setGarmentImage(slot.id, null)}
                allowCamera={false}
                canRemove={garmentSlots.length > 1}
                onRemoveSlot={() => removeGarmentSlot(slot.id)}
              />
            ))}
            {garmentSlots.length === 1 && (
              <UploadZone
                label="Your Photo"
                image={modelImage}
                onFile={setModelImage}
                onClear={() => setModelImage(null)}
                allowCamera={true}
              />
            )}
          </div>
          {/* Model photo in separate row when multiple garments */}
          {garmentSlots.length > 1 && (
            <div className="mt-4 max-w-[200px] mx-auto">
              <UploadZone
                label="Your Photo"
                image={modelImage}
                onFile={setModelImage}
                onClear={() => setModelImage(null)}
                allowCamera={true}
              />
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="bg-muted/50 rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm mb-1">💡 Tips for best results</p>
          <p>• Use clear, front-facing garment images on a plain background</p>
          <p>• You can add shirt + pants together for a full outfit try-on</p>
          <p>• Use a full-body photo with good lighting for best results</p>
        </div>

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
              onClick={() => { setResult(null); setModelImage(null); setGarmentSlots([makeSlot("Shirt / Top")]); }}
            >
              Try Another
            </Button>
          </div>
        )}

        {!isProcessing && !result && lastError && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 animate-fade-in">
            <p className="font-medium text-sm text-destructive">Could not generate result</p>
            <p className="mt-1 text-xs text-muted-foreground">{lastError}</p>
          </div>
        )}

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
