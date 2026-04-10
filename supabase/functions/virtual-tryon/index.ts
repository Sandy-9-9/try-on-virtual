import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SINGLE_GARMENT_PROMPT =
  "You are an expert fashion AI. I provide two images: IMAGE 1 is a person's photo, IMAGE 2 is a clothing garment. YOUR TASK: Create a completely new photorealistic image where you REDRAW the person from IMAGE 1 but now wearing the garment from IMAGE 2. CRITICAL INSTRUCTIONS: You must NOT copy-paste or overlay the garment image onto the person. Instead, you must REGENERATE the entire person's torso area with the new garment fitted naturally to their body shape. The garment must conform to the person's shoulders, arms, chest, and waist. Add natural wrinkles, folds, and shadows where the fabric bends. The person's face, hair, hands, lower body, and background must remain IDENTICAL to IMAGE 1. The final image should look like a real photograph taken of this person actually wearing this garment — not a photoshopped composite.";

const MULTI_GARMENT_PROMPT =
  "You are an expert fashion AI. I provide multiple images: IMAGE 1 is a person's photo. The remaining images are clothing garments (e.g., a shirt/top and pants/bottom, or a full outfit). YOUR TASK: Create a completely new photorealistic image where you REDRAW the person from IMAGE 1 but now wearing ALL the garments from the other images as a complete outfit. CRITICAL INSTRUCTIONS: You must NOT copy-paste or overlay the garment images onto the person. Instead, you must REGENERATE the person's entire body with ALL the new garments fitted naturally to their body shape. Each garment must conform to the person's body — the top to shoulders/chest/waist, the bottom to waist/hips/legs. Add natural wrinkles, folds, and shadows where the fabric bends. The person's face, hair, and background must remain IDENTICAL to IMAGE 1. The final image should look like a real photograph taken of this person actually wearing this complete outfit — not a photoshopped composite.";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

type TryOnResult = {
  image?: string;
  status?: number;
  error?: string;
  retryAfterSeconds?: number;
  kind?: "rate_limit" | "quota" | "bad_request" | "unknown";
};

function isDataUrl(s: string): boolean {
  return /^data:[^;]+;base64,/.test(s);
}

function extractBase64(dataUrl: string): { mime_type: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL format");
  return { mime_type: match[1], data: match[2] };
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function validateImageInput(input: string, fieldName: string): string | null {
  if (!input || typeof input !== "string") {
    return `${fieldName} is required and must be a string`;
  }
  if (isDataUrl(input)) {
    const dataUrlMatch = input.match(/^data:([^;]+);base64,([A-Za-z0-9+/]+=*)$/);
    if (!dataUrlMatch) return `${fieldName} has invalid data URL format`;
    const mimeType = dataUrlMatch[1];
    const base64Data = dataUrlMatch[2];
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) return `${fieldName} must be PNG, JPEG, or WebP. Got: ${mimeType}`;
    try { atob(base64Data); } catch { return `${fieldName} has invalid base64 encoding`; }
    const approximateSize = Math.ceil(base64Data.length * 0.75);
    if (approximateSize > MAX_IMAGE_SIZE) return `${fieldName} exceeds 10MB size limit`;
    return null;
  }
  if (/^https?:\/\//.test(input)) {
    try { new URL(input); return null; } catch { return `${fieldName} has invalid URL format`; }
  }
  return `${fieldName} must be a data URL (data:image/...) or an HTTPS URL`;
}

async function toInlineData(input: string): Promise<{ mime_type: string; data: string }> {
  if (isDataUrl(input)) return extractBase64(input);
  if (/^https?:\/\//.test(input)) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Failed to fetch image URL (${res.status}).`);
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const mime_type = contentType.split(";")[0];
    if (!ALLOWED_MIME_TYPES.includes(mime_type)) throw new Error(`Remote image has unsupported type: ${mime_type}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_SIZE) throw new Error(`Remote image exceeds 10MB size limit`);
    return { mime_type, data: arrayBufferToBase64(buf) };
  }
  throw new Error("Unsupported image format. Provide a data URL or an https URL.");
}

async function callLovableGateway(apiKey: string, modelImage: string, clothImages: string[]): Promise<TryOnResult> {
  console.log(`Processing virtual try-on with Lovable AI Gateway (${clothImages.length} garment(s))...`);

  const prompt = clothImages.length > 1 ? MULTI_GARMENT_PROMPT : SINGLE_GARMENT_PROMPT;

  const content: any[] = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: modelImage } },
    ...clothImages.map((img) => ({ type: "image_url", image_url: { url: img } })),
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Lovable AI Gateway error:", response.status, errorText);
    return {
      status: response.status,
      error: response.status === 429 ? "Too many requests. Please try again later." : response.status === 402 ? "AI credits exhausted. Please add funds." : `Gateway error: ${response.status}`,
      kind: response.status === 429 ? "rate_limit" : response.status === 402 ? "quota" : "unknown",
    };
  }

  const data = await response.json();
  console.log("Gateway full response keys:", JSON.stringify(Object.keys(data)));

  const choices = data.choices || [];
  for (const choice of choices) {
    const msg = choice?.message;
    if (!msg) continue;

    if (msg.image && typeof msg.image === "string" && msg.image.startsWith("data:")) return { image: msg.image };

    if (Array.isArray(msg.images)) {
      for (const img of msg.images) {
        const url = img?.image_url?.url || img?.url || (typeof img === "string" ? img : null);
        if (url && typeof url === "string" && url.startsWith("data:")) return { image: url };
      }
    }

    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part?.type === "image_url" && part?.image_url?.url) {
          const url = part.image_url.url;
          if (url.startsWith("data:")) return { image: url };
          if (url.startsWith("http")) {
            try {
              const r = await fetch(url);
              if (r.ok) {
                const buf = await r.arrayBuffer();
                const ct = r.headers.get("content-type") || "image/png";
                return { image: `data:${ct.split(";")[0]};base64,${arrayBufferToBase64(buf)}` };
              }
            } catch { /* continue */ }
          }
        }
        const inline = part?.inlineData || part?.inline_data;
        if (inline) {
          const mt = inline.mimeType || inline.mime_type;
          const d = inline.data;
          if (typeof mt === "string" && mt.startsWith("image/") && typeof d === "string") return { image: `data:${mt};base64,${d}` };
        }
      }
    }

    if (typeof msg.content === "string" && msg.content.startsWith("data:image")) return { image: msg.content };

    const parts = msg.parts || [];
    for (const part of parts) {
      const inline = part?.inlineData || part?.inline_data;
      if (inline) {
        const mt = inline.mimeType || inline.mime_type;
        const d = inline.data;
        if (typeof mt === "string" && mt.startsWith("image/") && typeof d === "string") return { image: `data:${mt};base64,${d}` };
      }
    }
  }

  console.error("Gateway response (no image found):", JSON.stringify(data).slice(0, 1000));
  return { status: 500, error: "No image generated by gateway", kind: "unknown" };
}

async function callGeminiDirect(apiKey: string, modelImage: string, clothImages: string[]): Promise<TryOnResult> {
  console.log(`Processing virtual try-on with Gemini (${clothImages.length} garment(s))...`);

  const prompt = clothImages.length > 1 ? MULTI_GARMENT_PROMPT : SINGLE_GARMENT_PROMPT;

  let modelImageData;
  const clothImageDataList = [];
  try {
    modelImageData = await toInlineData(modelImage);
    for (const img of clothImages) {
      clothImageDataList.push(await toInlineData(img));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid image input";
    console.error("Direct fallback input error:", msg);
    return { status: 400, kind: "bad_request", error: msg };
  }

  const parts: any[] = [
    { text: prompt },
    { inline_data: modelImageData },
    ...clothImageDataList.map((d) => ({ inline_data: d })),
  ];

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: "3:4", imageSize: "1K" },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini direct API error:", response.status);
    let msg = `AI provider error: ${response.status}`;
    let retryAfterSeconds: number | undefined;
    let kind: TryOnResult["kind"] = response.status === 429 ? "rate_limit" : "unknown";
    try {
      const parsed = JSON.parse(errorText);
      const apiMsg = parsed?.error?.message;
      const details = parsed?.error?.details;
      if (Array.isArray(details)) {
        const retryInfo = details.find((d: unknown) => (d as Record<string, unknown>)?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo");
        const retryDelay = (retryInfo as Record<string, unknown>)?.retryDelay;
        if (typeof retryDelay === "string") {
          const m = retryDelay.match(/(\d+)s/);
          if (m) retryAfterSeconds = Number(m[1]);
        }
      }
      if (typeof apiMsg === "string" && apiMsg.trim()) {
        const isFreeTierZero = apiMsg.includes("free_tier") && apiMsg.includes("limit: 0");
        if (isFreeTierZero) {
          kind = "quota";
          msg = "Your AI API key has no free-tier quota for image generation (limit is 0). Enable billing for the key, then try again.";
        } else {
          msg = apiMsg;
        }
      }
    } catch { /* ignore */ }
    return { status: response.status, error: msg, retryAfterSeconds, kind };
  }

  const data = await response.json();
  const resParts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of resParts) {
    const inline = part?.inlineData || part?.inline_data;
    const mimeType = inline?.mimeType || inline?.mime_type;
    const base64 = inline?.data;
    if (typeof mimeType === "string" && mimeType.startsWith("image/") && typeof base64 === "string") {
      return { image: `data:${mimeType};base64,${base64}` };
    }
  }
  return { status: 500, error: "No image generated by fallback provider", kind: "unknown" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("Processing virtual try-on request...");

    let body: { clothImage?: unknown; clothImages?: unknown; modelImage?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { modelImage } = body;

    // Support both clothImages (array) and clothImage (single) for backward compat
    let clothImagesList: string[] = [];
    if (Array.isArray(body.clothImages)) {
      clothImagesList = body.clothImages as string[];
    } else if (typeof body.clothImage === "string") {
      clothImagesList = [body.clothImage as string];
    }

    if (clothImagesList.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one garment image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (clothImagesList.length > 3) {
      return new Response(
        JSON.stringify({ error: "Maximum 3 garment images allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate all images
    for (let i = 0; i < clothImagesList.length; i++) {
      const err = validateImageInput(clothImagesList[i], `clothImages[${i}]`);
      if (err) {
        return new Response(
          JSON.stringify({ error: err }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const modelError = validateImageInput(modelImage as string, "modelImage");
    if (modelError) {
      return new Response(
        JSON.stringify({ error: modelError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    let last: TryOnResult | undefined;

    if (GEMINI_API_KEY) {
      last = await callGeminiDirect(GEMINI_API_KEY, modelImage as string, clothImagesList);
    }

    if (!last?.image && LOVABLE_API_KEY) {
      console.log("Falling back to Lovable AI Gateway...");
      last = await callLovableGateway(LOVABLE_API_KEY, modelImage as string, clothImagesList);
    }

    if (!last) {
      return new Response(JSON.stringify({ error: "No AI provider configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!last.image) {
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (last.retryAfterSeconds) headers["Retry-After"] = String(last.retryAfterSeconds);
      return new Response(
        JSON.stringify({ error: last.error || "Failed to generate image", retryAfterSeconds: last.retryAfterSeconds }),
        { status: last.status ?? 500, headers },
      );
    }

    console.log("Virtual try-on successful");
    return new Response(JSON.stringify({ image: last.image }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Virtual try-on error");
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
