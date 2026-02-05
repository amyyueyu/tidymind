 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { imageUrl, intent } = await req.json();
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     const intentPrompts: Record<string, string> = {
       tidy: "Transform this room to look perfectly tidy and organized. Keep all existing furniture and items, but show them neatly arranged and surfaces cleared.",
       declutter: "Transform this room to show a decluttered, minimalist version. Remove excess items, keep only essentials, and show a clean, open space.",
       redesign: "Redesign this room with better organization and flow. Suggest a new arrangement that maximizes space and functionality while maintaining the room's purpose."
     };
 
     const prompt = `${intentPrompts[intent] || intentPrompts.tidy} Create a photorealistic visualization of the transformed space. The image should look inspiring and achievable, showing what this exact room could look like after the transformation. Maintain the same perspective and room structure.`;
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-2.5-flash-image",
         messages: [
           {
             role: "user",
             content: [
               { type: "text", text: prompt },
               { type: "image_url", image_url: { url: imageUrl } }
             ]
           }
         ],
         modalities: ["image", "text"]
       }),
     });
 
     if (!response.ok) {
       if (response.status === 429) {
         return new Response(
           JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
           { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       if (response.status === 402) {
         return new Response(
           JSON.stringify({ error: "AI credits depleted. Please add more credits." }),
           { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       const errorText = await response.text();
       console.error("AI gateway error:", response.status, errorText);
       throw new Error(`AI gateway error: ${response.status}`);
     }
 
     const data = await response.json();
     const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
     const message = data.choices?.[0]?.message?.content;
 
     if (!generatedImage) {
       throw new Error("No image generated");
     }
 
     return new Response(
       JSON.stringify({ 
         imageUrl: generatedImage,
         message: message || "Here's your vision for the transformed space!"
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error) {
     console.error("generate-vision error:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });