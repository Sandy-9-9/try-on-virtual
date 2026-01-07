import { useState, useRef } from "react";
import { Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const VirtualTryOn = () => {
  const [clothImage, setClothImage] = useState<string | null>(null);
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
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

  const handleTryOn = () => {
    if (!clothImage || !modelImage) return;
    
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setResult(modelImage);
      setIsProcessing(false);
    }, 2000);
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
        
        {result ? (
          <div className="bg-[hsl(210_11%_20%)] rounded-lg p-8">
            <img
              src={result}
              alt="Try-on result"
              className="max-h-96 mx-auto rounded-lg shadow-lg"
            />
            <p className="mt-4 text-[hsl(0_0%_60%)] text-sm">
              Virtual try-on preview (demo)
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
