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

export function drawImageWarpedToQuad(opts: {
  ctx: CanvasRenderingContext2D;
  img: HTMLImageElement;
  quad: [Point, Point, Point, Point];
  opacity: number;
  compositeMode: WarpCompositeMode;
}) {
  const { ctx, img, quad, opacity, compositeMode } = opts;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return;

  // Split quad into two triangles: (0,1,2) and (0,2,3)
  const srcA: [Point, Point, Point] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
  ];
  const dstA: [Point, Point, Point] = [quad[0], quad[1], quad[2]];

  const srcB: [Point, Point, Point] = [
    { x: 0, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  const dstB: [Point, Point, Point] = [quad[0], quad[2], quad[3]];

  const modeMap: Record<WarpCompositeMode, GlobalCompositeOperation> = {
    normal: "source-over",
    multiply: "multiply",
    overlay: "overlay",
    "soft-light": "soft-light",
  };

  const drawTriangle = (src: [Point, Point, Point], dst: [Point, Point, Point]) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = modeMap[compositeMode];

    // Clip to destination triangle
    ctx.beginPath();
    ctx.moveTo(dst[0].x, dst[0].y);
    ctx.lineTo(dst[1].x, dst[1].y);
    ctx.lineTo(dst[2].x, dst[2].y);
    ctx.closePath();
    ctx.clip();

    // Map source triangle to destination triangle with an affine transform
    const { a, b, c, d, e, f } = affineFromTriangles(src, dst);

    ctx.setTransform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);

    ctx.restore();
  };

  // Always start from identity transform for safety
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawTriangle(srcA, dstA);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawTriangle(srcB, dstB);
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
