import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Create a NEW photorealistic fashion photo of the person in the FIRST image wearing the clothing item from the SECOND image. IMPORTANT: Do NOT overlay, paste, or copy pixels from either input image. The output MUST be a newly generated image (not the original person photo and not the original clothing photo). Preserve the person's identity (face, hair, skin tone) and keep the background/lighting consistent with the FIRST image. Replace the person's current outfit entirely. The garment must fit naturally to the body with realistic fabric drape, folds, shadows, and correct perspective.",
              },
              {
                type: "image_url",
                image_url: { url: modelImage },
              },
              {
                type: "image_url",
                image_url: { url: clothImage },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to process virtual try-on" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    // The model sometimes echoes an input image for complex cases; treat that as a failure.
    if (generatedImage === clothImage || generatedImage === modelImage) {
      console.warn("Try-on generation returned an input image (echo).", {
        generatedPrefix: generatedImage?.slice?.(0, 32),
      });
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
