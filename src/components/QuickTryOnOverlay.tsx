import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { drawImageWarpedToQuad, pointInQuad, type Point, type WarpCompositeMode } from "@/lib/image-warp";

type Props = {
  modelImage: string;
  clothImage: string;
};

type DragState =
  | { kind: "none" }
  | { kind: "move"; start: Point; base: [Point, Point, Point, Point] }
  | { kind: "handle"; index: 0 | 1 | 2 | 3 };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function copyQuad(q: [Point, Point, Point, Point]): [Point, Point, Point, Point] {
  return q.map((p) => ({ x: p.x, y: p.y })) as any;
}

export function QuickTryOnOverlay({ modelImage, clothImage }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const clothImgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragState>({ kind: "none" });

  const [opacity, setOpacity] = useState(0.85);
  const [compositeMode, setCompositeMode] = useState<WarpCompositeMode>("multiply");
  const [showHandles, setShowHandles] = useState(true);

  const [quad, setQuad] = useState<[Point, Point, Point, Point]>([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);

  const defaultQuadForSize = useCallback((w: number, h: number) => {
    // A sensible starting box around the torso area.
    const cx = w * 0.5;
    const cy = h * 0.45;
    const bw = w * 0.42;
    const bh = h * 0.48;

    return [
      { x: cx - bw / 2, y: cy - bh / 2 }, // top-left
      { x: cx + bw / 2, y: cy - bh / 2 }, // top-right
      { x: cx + bw / 2, y: cy + bh / 2 }, // bottom-right
      { x: cx - bw / 2, y: cy + bh / 2 }, // bottom-left
    ] as [Point, Point, Point, Point];
  }, []);

  const reset = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setQuad(defaultQuadForSize(rect.width, rect.height));
    setOpacity(0.85);
    setCompositeMode("multiply");
    setShowHandles(true);
  }, [defaultQuadForSize]);

  const resizeCanvasToContainer = useCallback(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const rect = el.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(rect.width));
    const nextH = Math.max(1, Math.round(rect.height));

    if (canvas.width !== nextW) canvas.width = nextW;
    if (canvas.height !== nextH) canvas.height = nextH;

    // If quad is uninitialized, seed it.
    setQuad((q) => {
      const allZero = q.every((p) => p.x === 0 && p.y === 0);
      return allZero ? defaultQuadForSize(nextW, nextH) : q;
    });
  }, [defaultQuadForSize]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = clothImgRef.current;
    if (!canvas || !ctx || !img) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawImageWarpedToQuad({
      ctx,
      img,
      quad,
      opacity,
      compositeMode,
    });

    if (showHandles) {
      // Draw handles + outline
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      ctx.beginPath();
      ctx.moveTo(quad[0].x, quad[0].y);
      ctx.lineTo(quad[1].x, quad[1].y);
      ctx.lineTo(quad[2].x, quad[2].y);
      ctx.lineTo(quad[3].x, quad[3].y);
      ctx.closePath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "hsl(var(--primary))";
      ctx.stroke();

      for (let i = 0; i < 4; i++) {
        const p = quad[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "hsl(var(--background))";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "hsl(var(--primary))";
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [quad, opacity, compositeMode, showHandles]);

  // Load garment image into an Image() for canvas drawing.
  useEffect(() => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = clothImage;

    const handleLoad = () => {
      clothImgRef.current = img;
      resizeCanvasToContainer();
      redraw();
    };

    img.addEventListener("load", handleLoad);
    return () => img.removeEventListener("load", handleLoad);
  }, [clothImage, redraw, resizeCanvasToContainer]);

  // Resize observer for container
  useEffect(() => {
    resizeCanvasToContainer();

    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      resizeCanvasToContainer();
      redraw();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [redraw, resizeCanvasToContainer]);

  // Redraw on state changes
  useEffect(() => {
    redraw();
  }, [redraw]);

  const hitTestHandle = useCallback(
    (p: Point) => {
      const radius = 14;
      for (let i = 0; i < 4; i++) {
        const d = Math.hypot(p.x - quad[i].x, p.y - quad[i].y);
        if (d <= radius) return i as 0 | 1 | 2 | 3;
      }
      return null;
    },
    [quad]
  );

  const getLocalPoint = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);

      const p = getLocalPoint(e.clientX, e.clientY);
      const handle = showHandles ? hitTestHandle(p) : null;

      if (handle !== null) {
        dragRef.current = { kind: "handle", index: handle };
        return;
      }

      if (pointInQuad(p, quad)) {
        dragRef.current = { kind: "move", start: p, base: copyQuad(quad) };
      } else {
        dragRef.current = { kind: "none" };
      }
    },
    [getLocalPoint, hitTestHandle, quad, showHandles]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const state = dragRef.current;
      if (state.kind === "none") return;

      const p = getLocalPoint(e.clientX, e.clientY);

      setQuad((prev) => {
        const w = canvas.width;
        const h = canvas.height;

        if (state.kind === "handle") {
          const next = copyQuad(prev);
          next[state.index] = { x: clamp(p.x, 0, w), y: clamp(p.y, 0, h) };
          return next;
        }

        if (state.kind === "move") {
          const dx = p.x - state.start.x;
          const dy = p.y - state.start.y;
          const base = state.base;
          const moved = base.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) as [
            Point,
            Point,
            Point,
            Point,
          ];

          // Keep inside canvas
          return moved.map((pt) => ({ x: clamp(pt.x, 0, w), y: clamp(pt.y, 0, h) })) as any;
        }

        return prev;
      });
    },
    [getLocalPoint]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = { kind: "none" };
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

  const modeLabel = useMemo(() => {
    switch (compositeMode) {
      case "multiply":
        return "Multiply (best)";
      case "overlay":
        return "Overlay";
      case "soft-light":
        return "Soft light";
      default:
        return "Normal";
    }
  }, [compositeMode]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <div ref={containerRef} className="relative overflow-hidden rounded-md">
          <img
            src={modelImage}
            alt="Model preview"
            className="block w-full max-h-[520px] object-contain"
            loading="lazy"
          />

          {/* Canvas overlay (warped garment) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 cursor-move"
            onPointerDown={onPointerDown}
            aria-label="Garment overlay canvas"
          />
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          Drag inside the outline to move; drag the 4 dots to warp the garment so it wraps the body.
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Opacity</span>
              <span className="text-xs text-muted-foreground">{Math.round(opacity * 100)}%</span>
            </div>
            <Slider
              value={[opacity]}
              min={0.15}
              max={1}
              step={0.02}
              onValueChange={(v) => setOpacity(v[0] ?? 0.85)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Blend</span>
              <span className="text-xs text-muted-foreground">{modeLabel}</span>
            </div>
            <Select value={compositeMode} onValueChange={(v) => setCompositeMode(v as WarpCompositeMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Blend mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiply">Multiply (best)</SelectItem>
                <SelectItem value="soft-light">Soft light</SelectItem>
                <SelectItem value="overlay">Overlay</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowHandles((s) => !s)}>
              {showHandles ? "Hide handles" : "Show handles"}
            </Button>
            <Button variant="secondary" onClick={reset}>Reset</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

