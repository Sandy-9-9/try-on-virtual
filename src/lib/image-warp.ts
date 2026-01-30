export type Point = { x: number; y: number };

function affineFromTriangles(src: [Point, Point, Point], dst: [Point, Point, Point]) {
  const [p0, p1, p2] = src;
  const [q0, q1, q2] = dst;

  const den =
    p0.x * (p1.y - p2.y) +
    p1.x * (p2.y - p0.y) +
    p2.x * (p0.y - p1.y);

  if (Math.abs(den) < 1e-9) {
    // Degenerate triangle; return identity
    return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  }

  const a =
    (q0.x * (p1.y - p2.y) + q1.x * (p2.y - p0.y) + q2.x * (p0.y - p1.y)) / den;
  const c =
    (q0.x * (p2.x - p1.x) + q1.x * (p0.x - p2.x) + q2.x * (p1.x - p0.x)) / den;
  const e =
    (q0.x * (p1.x * p2.y - p2.x * p1.y) +
      q1.x * (p2.x * p0.y - p0.x * p2.y) +
      q2.x * (p0.x * p1.y - p1.x * p0.y)) /
    den;

  const b =
    (q0.y * (p1.y - p2.y) + q1.y * (p2.y - p0.y) + q2.y * (p0.y - p1.y)) / den;
  const d =
    (q0.y * (p2.x - p1.x) + q1.y * (p0.x - p2.x) + q2.y * (p1.x - p0.x)) / den;
  const f =
    (q0.y * (p1.x * p2.y - p2.x * p1.y) +
      q1.y * (p2.x * p0.y - p0.x * p2.y) +
      q2.y * (p0.x * p1.y - p1.x * p0.y)) /
    den;

  return { a, b, c, d, e, f };
}

export type WarpCompositeMode = "normal" | "multiply" | "overlay" | "soft-light";

/**
 * Bilinear interpolation of a point inside the quad.
 * u,v in [0,1]
 */
function bilinearInterpolate(quad: [Point, Point, Point, Point], u: number, v: number): Point {
  const top = { x: quad[0].x + (quad[1].x - quad[0].x) * u, y: quad[0].y + (quad[1].y - quad[0].y) * u };
  const bot = { x: quad[3].x + (quad[2].x - quad[3].x) * u, y: quad[3].y + (quad[2].y - quad[3].y) * u };
  return { x: top.x + (bot.x - top.x) * v, y: top.y + (bot.y - top.y) * v };
}

export function drawImageWarpedToQuad(opts: {
  ctx: CanvasRenderingContext2D;
  img: HTMLImageElement;
  quad: [Point, Point, Point, Point];
  opacity: number;
  compositeMode: WarpCompositeMode;
  /** Higher = smoother warp but slower. Default 6. */
  subdivisions?: number;
}) {
  const { ctx, img, quad, opacity, compositeMode, subdivisions = 6 } = opts;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return;

  const modeMap: Record<WarpCompositeMode, GlobalCompositeOperation> = {
    normal: "source-over",
    multiply: "multiply",
    overlay: "overlay",
    "soft-light": "soft-light",
  };

  const n = Math.max(1, subdivisions);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const u0 = col / n;
      const u1 = (col + 1) / n;
      const v0 = row / n;
      const v1 = (row + 1) / n;

      // Source corners (image space)
      const srcTopLeft: Point = { x: u0 * w, y: v0 * h };
      const srcTopRight: Point = { x: u1 * w, y: v0 * h };
      const srcBotRight: Point = { x: u1 * w, y: v1 * h };
      const srcBotLeft: Point = { x: u0 * w, y: v1 * h };

      // Dest corners (canvas space via bilinear)
      const dstTopLeft = bilinearInterpolate(quad, u0, v0);
      const dstTopRight = bilinearInterpolate(quad, u1, v0);
      const dstBotRight = bilinearInterpolate(quad, u1, v1);
      const dstBotLeft = bilinearInterpolate(quad, u0, v1);

      // Two triangles per cell
      const srcTriA: [Point, Point, Point] = [srcTopLeft, srcTopRight, srcBotRight];
      const dstTriA: [Point, Point, Point] = [dstTopLeft, dstTopRight, dstBotRight];

      const srcTriB: [Point, Point, Point] = [srcTopLeft, srcBotRight, srcBotLeft];
      const dstTriB: [Point, Point, Point] = [dstTopLeft, dstBotRight, dstBotLeft];

      const drawTriangle = (src: [Point, Point, Point], dst: [Point, Point, Point]) => {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = modeMap[compositeMode];

        ctx.beginPath();
        ctx.moveTo(dst[0].x, dst[0].y);
        ctx.lineTo(dst[1].x, dst[1].y);
        ctx.lineTo(dst[2].x, dst[2].y);
        ctx.closePath();
        ctx.clip();

        const { a, b, c, d, e, f } = affineFromTriangles(src, dst);
        ctx.setTransform(a, b, c, d, e, f);
        ctx.drawImage(img, 0, 0);

        ctx.restore();
      };

      drawTriangle(srcTriA, dstTriA);
      drawTriangle(srcTriB, dstTriB);
    }
  }

  ctx.restore();
}

export function pointInQuad(p: Point, quad: [Point, Point, Point, Point]) {
  // ray casting for polygon
  let inside = false;
  for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
    const xi = quad[i].x,
      yi = quad[i].y;
    const xj = quad[j].x,
      yj = quad[j].y;

    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
