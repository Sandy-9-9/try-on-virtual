import { cn } from "@/lib/utils";
import { Check, Upload } from "lucide-react";
import { useRef } from "react";

import femaleSlim from "@/assets/models/female-slim.jpg";
import femaleCurvy from "@/assets/models/female-curvy.jpg";
import maleAthletic from "@/assets/models/male-athletic.jpg";
import maleSlim from "@/assets/models/male-slim.jpg";

export type BodyType = "female-slim" | "female-curvy" | "male-athletic" | "male-slim" | "custom";

export interface ModelPreset {
  id: BodyType;
  label: string;
  image: string;
  /** Quad preset: percentages of container dimensions [cx, cy, width-ratio, height-ratio] */
  quadPreset: { cx: number; cy: number; wRatio: number; hRatio: number };
}

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: "female-slim",
    label: "Female – Slim",
    image: femaleSlim,
    quadPreset: { cx: 0.5, cy: 0.42, wRatio: 0.38, hRatio: 0.46 },
  },
  {
    id: "female-curvy",
    label: "Female – Curvy",
    image: femaleCurvy,
    quadPreset: { cx: 0.5, cy: 0.48, wRatio: 0.52, hRatio: 0.52 },
  },
  {
    id: "male-athletic",
    label: "Male – Athletic",
    image: maleAthletic,
    quadPreset: { cx: 0.5, cy: 0.48, wRatio: 0.48, hRatio: 0.50 },
  },
  {
    id: "male-slim",
    label: "Male – Slim",
    image: maleSlim,
    quadPreset: { cx: 0.5, cy: 0.44, wRatio: 0.40, hRatio: 0.48 },
  },
];

interface Props {
  selectedImage: string | null;
  selectedBodyType: BodyType | null;
  onSelect: (image: string, bodyType: BodyType) => void;
  onCustomUpload: (dataUrl: string) => void;
}

export function ModelGallery({ selectedImage, selectedBodyType, onSelect, onCustomUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onCustomUpload(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Choose a Model</h4>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MODEL_PRESETS.map((preset) => {
          const isSelected = selectedBodyType === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.image, preset.id)}
              className={cn(
                "relative rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring",
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              )}
            >
              <img
                src={preset.image}
                alt={preset.label}
                className="w-full aspect-[3/4] object-cover"
                loading="lazy"
              />
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs py-1 px-2 text-center truncate">
                {preset.label}
              </span>
            </button>
          );
        })}

        {/* Custom upload tile */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative rounded-lg overflow-hidden border-2 border-dashed transition-all flex flex-col items-center justify-center aspect-[3/4] gap-2",
            selectedBodyType === "custom"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 bg-muted/30"
          )}
        >
          {selectedBodyType === "custom" && selectedImage ? (
            <>
              <img
                src={selectedImage}
                alt="Custom upload"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs py-1 px-2 text-center truncate">
                Custom
              </span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Upload</span>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
