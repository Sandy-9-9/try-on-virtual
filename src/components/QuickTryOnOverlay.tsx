import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type Props = {
  modelImage: string;
  clothImage: string;
};

type DragState = {
  dragging: boolean;
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
};

export function QuickTryOnOverlay({ modelImage, clothImage }: Props) {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [opacity, setOpacity] = useState(0.8);

  const drag = useRef<DragState>({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const reset = useCallback(() => {
    setOffsetX(0);
    setOffsetY(0);
    setScale(1);
    setRotate(0);
    setOpacity(0.8);
  }, []);

  const overlayStyle = useMemo(
    () => ({
      transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotate}deg)`,
      opacity,
      touchAction: "none" as const,
    }),
    [offsetX, offsetY, scale, rotate, opacity]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offsetX,
      baseY: offsetY,
    };
  }, [offsetX, offsetY]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!drag.current.dragging) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    setOffsetX(drag.current.baseX + dx);
    setOffsetY(drag.current.baseY + dy);
  }, []);

  const onPointerUp = useCallback(() => {
    drag.current.dragging = false;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="relative overflow-hidden rounded-md">
          <img
            src={modelImage}
            alt="Model preview"
            className="block w-full max-h-[520px] object-contain"
            loading="lazy"
          />

          <img
            src={clothImage}
            alt="Clothing overlay"
            loading="lazy"
            className="absolute left-1/2 top-[42%] w-[55%] max-w-[420px] cursor-grab select-none object-contain active:cursor-grabbing"
            style={overlayStyle}
            onPointerDown={onPointerDown}
          />
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          Drag the clothing to position it on the model.
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Size</span>
              <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
            </div>
            <Slider
              value={[scale]}
              min={0.4}
              max={2.0}
              step={0.02}
              onValueChange={(v) => setScale(v[0] ?? 1)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Opacity</span>
              <span className="text-xs text-muted-foreground">{Math.round(opacity * 100)}%</span>
            </div>
            <Slider
              value={[opacity]}
              min={0.2}
              max={1}
              step={0.02}
              onValueChange={(v) => setOpacity(v[0] ?? 0.8)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rotate</span>
              <span className="text-xs text-muted-foreground">{rotate}°</span>
            </div>
            <Slider
              value={[rotate]}
              min={-35}
              max={35}
              step={1}
              onValueChange={(v) => setRotate(v[0] ?? 0)}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={reset}>Reset</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
