import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT =
  "Remove the background from this clothing/garment image completely. Keep ONLY the garment item itself with a fully transparent background. The output must be a PNG with transparency. Do not add any background color - make it fully transparent.";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.log("No Lovable API key, returning original image");
      return new Response(
        JSON.stringify({ image, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Removing background from garment image...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Background removal error:", response.status, errorText);
      
      // On error, return original image to allow the flow to continue
      if (response.status === 402 || response.status === 429) {
        console.log("Rate limited or quota exceeded, returning original image");
        return new Response(
          JSON.stringify({ image, skipped: true, reason: "quota_or_rate_limit" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ image, skipped: true, reason: "api_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const processedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!processedImage) {
      console.log("No processed image returned, using original");
      return new Response(
        JSON.stringify({ image, skipped: true, reason: "no_output" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Background removed successfully");
    return new Response(
      JSON.stringify({ image: processedImage, skipped: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Remove background error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
