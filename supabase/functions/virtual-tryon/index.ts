import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT =
  "Create a NEW photorealistic fashion photo of the person in the FIRST image wearing the clothing item from the SECOND image. IMPORTANT: Do NOT overlay, paste, or copy pixels from either input image. The output MUST be a newly generated image (not the original person photo and not the original clothing photo). Preserve the person's identity (face, hair, skin tone) and keep the background/lighting consistent with the FIRST image. Replace the person's current outfit entirely. The garment must fit naturally to the body with realistic fabric drape, folds, shadows, and correct perspective.";

// Call Lovable AI Gateway
async function callLovableGateway(
  apiKey: string,
  modelImage: string,
  clothImage: string
): Promise<{ image?: string; status?: number; error?: string }> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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
    return { status: response.status, error: await response.text() };
  }

  const data = await response.json();
  const image = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  return { image };
}

// Call Google Gemini API directly as fallback
async function callGeminiDirect(
  apiKey: string,
  modelImage: string,
  clothImage: string
): Promise<{
  image?: string;
  status?: number;
  error?: string;
  retryAfterSeconds?: number;
  kind?: string;
}> {
  console.log("Attempting fallback to direct Gemini API...");

  // Convert data URLs to inline_data format for Gemini
  const extractBase64 = (dataUrl: string) => {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid data URL format");
    return { mime_type: match[1], data: match[2] };
  };

  const modelImageData = extractBase64(modelImage);
  const clothImageData = extractBase64(clothImage);

  // Use a Gemini model that supports image generation directly.
  // Ref: https://ai.google.dev/gemini-api/docs/image-generation
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
          // Keep explicit to encourage image output.
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            // Reasonable default; can be tuned later.
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

    // Try to extract a helpful message from JSON
    let msg = `Gemini API error: ${response.status}`;
    let retryAfterSeconds: number | undefined;
    let kind: string | undefined;

    try {
      const parsed = JSON.parse(errorText);
      const apiMsg = parsed?.error?.message;
      const details = parsed?.error?.details;

      // Extract retry delay (e.g. "13s")
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
        // Detect the common "free tier limit: 0" case (this will never succeed until billing is enabled)
        const isFreeTierZero =
          apiMsg.includes("free_tier") && apiMsg.includes("limit: 0");

        if (isFreeTierZero) {
          kind = "quota";
          msg =
            "Your Gemini API key has no free-tier quota for image generation (limit is 0). Enable billing for the key and update GEMINI_API_KEY, then try again.";
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

  // Extract image from Gemini response
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part?.inlineData || part?.inline_data;
    const mimeType = inline?.mimeType || inline?.mime_type;
    const base64 = inline?.data;

    if (typeof mimeType === "string" && mimeType.startsWith("image/") && typeof base64 === "string") {
      return { image: `data:${mimeType};base64,${base64}` };
    }
  }

  return { status: 500, error: "No image generated by Gemini" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clothImage, modelImage } = await req.json();

    if (!clothImage || !modelImage) {
      return new Response(
        JSON.stringify({ error: "Both cloth and model images are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!LOVABLE_API_KEY && !GEMINI_API_KEY) {
      throw new Error("No API keys configured");
    }

    let generatedImage: string | undefined;

    // Try Lovable Gateway first
    if (LOVABLE_API_KEY) {
      console.log("Trying Lovable AI Gateway...");
      const result = await callLovableGateway(LOVABLE_API_KEY, modelImage, clothImage);

      if (result.image) {
        generatedImage = result.image;
      } else if (result.status === 402 || result.status === 429) {
        console.log(`Lovable Gateway returned ${result.status}, checking for fallback...`);

        // Fallback to user's Gemini key if available
        if (GEMINI_API_KEY) {
          const fallbackResult = await callGeminiDirect(GEMINI_API_KEY, modelImage, clothImage);
          if (fallbackResult.image) {
            generatedImage = fallbackResult.image;
          } else if (fallbackResult.error) {
            const headers: Record<string, string> = {
              ...corsHeaders,
              "Content-Type": "application/json",
            };
            if (fallbackResult.retryAfterSeconds) {
              headers["Retry-After"] = String(fallbackResult.retryAfterSeconds);
            }

            return new Response(
              JSON.stringify({
                error: fallbackResult.error,
                retryAfterSeconds: fallbackResult.retryAfterSeconds,
              }),
              {
                status: fallbackResult.status ?? 500,
                headers,
              }
            );
          }
        } else {
          // No fallback available
          const errorMsg =
            result.status === 402
              ? "AI credits exhausted. Add a GEMINI_API_KEY secret as fallback, or add workspace credits."
              : "Rate limited. Please try again later.";
          return new Response(
            JSON.stringify({ error: errorMsg }),
            { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.error("Lovable Gateway error:", result.error);
        return new Response(
          JSON.stringify({ error: "Failed to process virtual try-on" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (GEMINI_API_KEY) {
      // Only Gemini key available
      const result = await callGeminiDirect(GEMINI_API_KEY, modelImage, clothImage);
      if (result.image) {
        generatedImage = result.image;
      } else {
        const headers: Record<string, string> = {
          ...corsHeaders,
          "Content-Type": "application/json",
        };
        if (result.retryAfterSeconds) {
          headers["Retry-After"] = String(result.retryAfterSeconds);
        }

        return new Response(
          JSON.stringify({
            error: result.error || "Failed to generate image",
            retryAfterSeconds: result.retryAfterSeconds,
          }),
          {
            status: result.status ?? 500,
            headers,
          }
        );
      }
    }

    // The model sometimes echoes an input image for complex cases; treat that as a failure.
    if (generatedImage === clothImage || generatedImage === modelImage) {
      console.warn("Try-on generation returned an input image (echo).");
      return new Response(
        JSON.stringify({
          error:
            "Try-on failed (the AI returned one of the input images). Please try a simpler garment photo (clear front view, plain background) or a different model photo.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!generatedImage) {
      return new Response(
        JSON.stringify({ error: "No image was generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ image: generatedImage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Virtual try-on error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
