import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT = `You are a virtual fashion stylist. Create a NEW photorealistic fashion photo showing the person from the FIRST image wearing the clothing item from the SECOND image.

CRITICAL REQUIREMENTS:
1. Generate a COMPLETELY NEW image - do NOT just overlay or paste the clothing
2. Preserve the person's identity: face, hair, skin tone, body shape
3. Keep the background and lighting consistent with the FIRST (model) image
4. Replace the person's current outfit entirely with the garment from the SECOND image
5. The garment must fit naturally with realistic fabric drape, folds, shadows, and correct perspective
6. Output must be a high-quality, photorealistic fashion photograph`;

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
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calling Lovable AI Gateway with gemini-2.5-flash-image-preview...");

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

      // Handle specific error codes
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI credits exhausted. Please upgrade your plan or wait for credits to refresh." 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 429) {
        // Try to extract retry info
        let retryAfterSeconds = 30;
        try {
          const parsed = JSON.parse(errorText);
          const retryMatch = parsed?.error?.match?.(/retry in (\d+)/i);
          if (retryMatch) {
            retryAfterSeconds = parseInt(retryMatch[1], 10);
          }
        } catch {
          // ignore
        }

        return new Response(
          JSON.stringify({ 
            error: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
            retryAfterSeconds 
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "Retry-After": String(retryAfterSeconds)
            } 
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to process virtual try-on. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Lovable AI Gateway response received");

    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image in response:", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "AI did not generate an image. Please try with different photos." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the result isn't just an echo of input images
    if (generatedImage === clothImage || generatedImage === modelImage) {
      console.warn("AI returned an input image instead of generating a new one");
      return new Response(
        JSON.stringify({
          error: "Try-on failed. Please try a simpler garment photo (clear front view, plain background) or a different model photo.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Virtual try-on successful, returning generated image");
    return new Response(
      JSON.stringify({ image: generatedImage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Virtual try-on error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
