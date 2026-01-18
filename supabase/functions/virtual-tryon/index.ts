import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT =
  "Create a NEW photorealistic fashion photo of the person in the FIRST image wearing the clothing item from the SECOND image. IMPORTANT: Do NOT overlay, paste, or copy pixels from either input image. The output MUST be a newly generated image (not the original person photo and not the original clothing photo). Preserve the person's identity (face, hair, skin tone) and keep the background/lighting consistent with the FIRST image. Replace the person's current outfit entirely. The garment must fit naturally to the body with realistic fabric drape, folds, shadows, and correct perspective.";

type TryOnResult = {
  image?: string;
  status?: number;
  error?: string;
  retryAfterSeconds?: number;
  kind?: "rate_limit" | "quota" | "bad_request" | "unknown";
};

function isDataUrl(s: string) {
  return /^data:[^;]+;base64,/.test(s);
}

function extractBase64(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL format");
  return { mime_type: match[1], data: match[2] };
}

function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function toInlineData(input: string): Promise<{ mime_type: string; data: string }> {
  if (isDataUrl(input)) return extractBase64(input);

  if (/^https?:\/\//.test(input)) {
    const res = await fetch(input);
    if (!res.ok) {
      throw new Error(`Failed to fetch image URL (${res.status}).`);
    }

    const mime_type = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
    const buf = await res.arrayBuffer();
    const data = arrayBufferToBase64(buf);

    return { mime_type, data };
  }

  throw new Error("Unsupported image format. Provide a data URL or an https URL.");
}

async function callLovableGateway(apiKey: string, modelImage: string, clothImage: string): Promise<TryOnResult> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Keep the stronger image model here; if workspace credits are exhausted, we will fall back.
      model: "google/gemini-3-pro-image-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: modelImage } },
            { type: "image_url", image_url: { url: clothImage } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Lovable AI Gateway error:", response.status, errorText);
    return {
      status: response.status,
      error: errorText,
      kind: response.status === 429 ? "rate_limit" : response.status === 402 ? "quota" : "unknown",
    };
  }

  const data = await response.json();
  const image = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!image) return { status: 500, error: "No image generated", kind: "unknown" };
  return { image };
}

async function callGeminiDirect(apiKey: string, modelImage: string, clothImage: string): Promise<TryOnResult> {
  // This path does NOT depend on workspace credits. It uses the user's key.
  // Supports BOTH base64 data URLs and https URLs.

  console.log("Trying direct AI fallback using user key...");

  let modelImageData;
  let clothImageData;
  try {
    modelImageData = await toInlineData(modelImage);
    clothImageData = await toInlineData(clothImage);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid image input";
    console.error("Direct fallback input error:", msg);
    return { status: 400, kind: "bad_request", error: msg };
  }
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT },
              { inline_data: modelImageData },
              { inline_data: clothImageData },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "3:4",
            imageSize: "1K",
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini direct API error:", response.status, errorText);

    let msg = `AI provider error: ${response.status}`;
    let retryAfterSeconds: number | undefined;
    let kind: TryOnResult["kind"] = response.status === 429 ? "rate_limit" : "unknown";

    try {
      const parsed = JSON.parse(errorText);
      const apiMsg = parsed?.error?.message;
      const details = parsed?.error?.details;

      if (Array.isArray(details)) {
        const retryInfo = details.find(
          (d: any) => d?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
        );
        const retryDelay = retryInfo?.retryDelay;
        if (typeof retryDelay === "string") {
          const m = retryDelay.match(/(\d+)s/);
          if (m) retryAfterSeconds = Number(m[1]);
        }
      }

      if (typeof apiMsg === "string" && apiMsg.trim()) {
        const isFreeTierZero = apiMsg.includes("free_tier") && apiMsg.includes("limit: 0");
        if (isFreeTierZero) {
          kind = "quota";
          msg =
            "Your AI API key has no free-tier quota for image generation (limit is 0). Enable billing for the key, then try again.";
        } else {
          msg = apiMsg;
        }
      }
    } catch {
      // ignore
    }

    return { status: response.status, error: msg, retryAfterSeconds, kind };
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
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
    const { clothImage, modelImage } = await req.json();

    if (!clothImage || !modelImage) {
      return new Response(JSON.stringify({ error: "Both cloth and model images are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!LOVABLE_API_KEY && !GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "No AI provider configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prefer the user's key (works even when workspace credits are exhausted)
    const attempts: Array<() => Promise<TryOnResult>> = [];
    if (GEMINI_API_KEY) attempts.push(() => callGeminiDirect(GEMINI_API_KEY, modelImage, clothImage));
    if (LOVABLE_API_KEY) attempts.push(() => callLovableGateway(LOVABLE_API_KEY, modelImage, clothImage));

    let last: TryOnResult | undefined;

    for (const attempt of attempts) {
      last = await attempt();
      if (last.image) break;

      // If it's a hard quota problem for that provider, try the next one.
      // Otherwise also try next provider to maximize chance of success.
    }

    const generatedImage = last?.image;

    if (!generatedImage) {
      const headers: Record<string, string> = {
        ...corsHeaders,
        "Content-Type": "application/json",
      };
      if (last?.retryAfterSeconds) headers["Retry-After"] = String(last.retryAfterSeconds);

      return new Response(
        JSON.stringify({
          error: last?.error || "Failed to generate image",
          retryAfterSeconds: last?.retryAfterSeconds,
        }),
        {
          status: last?.status ?? 500,
          headers,
        }
      );
    }

    // Result validation: avoid showing an echoed input image
    if (generatedImage === clothImage || generatedImage === modelImage) {
      return new Response(
        JSON.stringify({
          error:
            "Try-on failed (the AI returned one of the input images). Please try a simpler garment photo (clear front view, plain background) or a different model photo.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ image: generatedImage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Virtual try-on error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
