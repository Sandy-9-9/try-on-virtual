import { useState, useRef, useEffect } from "react";
import { Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
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

const VirtualTryOn = () => {
  const [clothImage, setClothImage] = useState<string | null>(null);
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const { toast } = useToast();

  const clothInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Progress animation effect
  useEffect(() => {
    if (!isProcessing) {
      setProgress(0);
      setLoadingMessage(loadingMessages[0]);
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const increment = Math.random() * 8 + 2;
        return Math.min(prev + increment, 95);
      });
    }, 500);

    const messageInterval = setInterval(() => {
      setLoadingMessage((prev) => {
        const currentIndex = loadingMessages.indexOf(prev);
        const nextIndex = (currentIndex + 1) % loadingMessages.length;
        return loadingMessages[nextIndex];
      });
    }, 2500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [isProcessing]);

  const handleTryOn = async () => {
    if (!clothImage || !modelImage) return;

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
          throw new Error(
            "Try-on failed (the AI returned an input image). Please try a clearer garment photo or a different model photo."
          );
        }
        setResult(data.image);
        toast({
          title: "Success!",
          description: "Virtual try-on completed successfully.",
        });
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error("No image was generated. Please try again.");
      }
    } catch (error: any) {
      const status = error?.context?.status ?? error?.status;

      // Try to extract backend error message body (often JSON)
      let backendMsg: string | undefined;
      let retryAfterSeconds: number | undefined;
      const bodyText = error?.context?.body;
      if (typeof bodyText === "string") {
        try {
          const parsed = JSON.parse(bodyText);
          if (typeof parsed?.error === "string") backendMsg = parsed.error;
          if (typeof parsed?.retryAfterSeconds === "number") retryAfterSeconds = parsed.retryAfterSeconds;
        } catch {
          // ignore
        }
      }

      const retryHint = retryAfterSeconds ? ` Try again in ~${retryAfterSeconds}s.` : "";

      const message =
        status === 402
          ? (backendMsg || "AI provider is temporarily unavailable. Please try again.")
          : status === 429
            ? (backendMsg ? `${backendMsg}${retryHint}` : `Too many requests right now. Please wait a minute and try again.${retryHint}`)
            : backendMsg || error?.message || "Failed to process virtual try-on. Please try again.";

      console.error("Try-on error:", { status, message });
      setLastError(message);

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210_11%_15%)] text-[hsl(0_0%_90%)]">
      {/* Header */}
      <header className="py-6 text-center border-b border-[hsl(210_11%_25%)]">
        <h1 className="text-3xl md:text-4xl font-semibold">
          Virtual Cloth Assistant
        </h1>
        <Link
          to="/"
          className="absolute top-6 left-6 text-[hsl(0_0%_70%)] hover:text-[hsl(0_0%_100%)] transition-colors text-sm"
        >
          ← Back to Store
        </Link>
      </header>

      {/* Hero */}
      <section className="text-center py-10 px-4">
        <p className="text-lg text-[hsl(0_0%_60%)] max-w-2xl mx-auto">
          Wanna try out how that cloth suits you?
          <br />
          Upgrade your shopping experience with an intelligent trial room.
        </p>
        <div className="w-16 h-1 bg-primary mx-auto mt-6" />
      </section>

      {/* Upload Section */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Cloth Image Upload */}
          <div>
            <h3 className="text-center mb-4 font-medium">Cloth Image</h3>
            <div
              onClick={() => clothInputRef.current?.click()}
              className="border-2 border-dashed border-[hsl(210_11%_35%)] rounded-lg p-8 min-h-[200px] flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
            >
              {clothImage ? (
                <img
                  src={clothImage}
                  alt="Cloth"
                  className="max-h-48 object-contain rounded"
                />
              ) : (
                <>
                  <Upload className="h-8 w-8 mb-2 text-[hsl(0_0%_50%)]" />
                  <span className="text-[hsl(0_0%_50%)]">Choose File</span>
                </>
              )}
            </div>
            <input
              ref={clothInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, setClothImage)}
              className="hidden"
            />
          </div>

          {/* Model Image Upload */}
          <div>
            <h3 className="text-center mb-4 font-medium">Model Image</h3>
            <div
              onClick={() => modelInputRef.current?.click()}
              className="border-2 border-dashed border-[hsl(210_11%_35%)] rounded-lg p-8 min-h-[200px] flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
            >
              {modelImage ? (
                <img
                  src={modelImage}
                  alt="Model"
                  className="max-h-48 object-contain rounded"
                />
              ) : (
                <>
                  <Upload className="h-8 w-8 mb-2 text-[hsl(0_0%_50%)]" />
                  <span className="text-[hsl(0_0%_50%)]">Choose File</span>
                </>
              )}
            </div>
            <input
              ref={modelInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, setModelImage)}
              className="hidden"
            />
          </div>
        </div>

        {/* Try It Button */}
        <div className="mt-8">
          <Button
            onClick={handleTryOn}
            disabled={!clothImage || !modelImage || isProcessing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 rounded-lg font-medium"
          >
            {isProcessing ? (
              <>
                <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Try It <Sparkles className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Result Section */}
      <section className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-8 tracking-wide">
          HERE IS YOUR RESULT
        </h2>
        
        {isProcessing ? (
          <div className="bg-[hsl(210_11%_20%)] rounded-lg p-8 animate-fade-in">
            <div className="flex flex-col items-center gap-6">
              {/* Animated sparkles */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-primary animate-pulse" />
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                  <Sparkles className="w-6 h-6 text-primary/50 absolute top-0 left-1/2 -translate-x-1/2" />
                  <Sparkles className="w-6 h-6 text-primary/50 absolute bottom-0 left-1/2 -translate-x-1/2" />
                  <Sparkles className="w-6 h-6 text-primary/50 absolute left-0 top-1/2 -translate-y-1/2" />
                  <Sparkles className="w-6 h-6 text-primary/50 absolute right-0 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              
              {/* Loading message */}
              <p className="text-[hsl(0_0%_70%)] text-lg font-medium animate-pulse">
                {loadingMessage}
              </p>
              
              {/* Progress bar */}
              <div className="w-full max-w-md space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-[hsl(0_0%_50%)] text-sm">
                  {Math.round(progress)}% complete
                </p>
              </div>
              
              {/* Tip */}
              <p className="text-[hsl(0_0%_40%)] text-xs mt-4">
                AI is generating your virtual try-on. This may take a moment...
              </p>
            </div>
          </div>
        ) : result ? (
          <div className="bg-[hsl(210_11%_20%)] rounded-lg p-8 animate-fade-in">
            <img
              src={result}
              alt="Try-on result"
              className="max-h-96 mx-auto rounded-lg shadow-lg"
            />
            <p className="mt-4 text-[hsl(0_0%_60%)] text-sm">
              Virtual try-on preview
            </p>
          </div>
        ) : lastError ? (
          <div className="bg-[hsl(210_11%_20%)] rounded-lg p-8 animate-fade-in">
            <p className="text-[hsl(0_0%_80%)] font-medium">Could not generate a result</p>
            <p className="mt-2 text-[hsl(0_0%_60%)] text-sm">{lastError}</p>
            <p className="mt-4 text-[hsl(0_0%_50%)] text-xs">
              Tip: If you just added credits, refresh the page and try again.
            </p>
          </div>
        ) : (
          <div className="bg-[hsl(210_11%_20%)] rounded-lg p-12 text-[hsl(0_0%_50%)]">
            <p>Upload both images and click "Try It" to see the result</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default VirtualTryOn;
