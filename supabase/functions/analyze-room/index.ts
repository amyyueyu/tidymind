 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Limits: authenticated users get 30 calls/hour, guests get 10 calls/hour
const AUTHED_MAX = 30;
const GUEST_MAX = 10;
const WINDOW_SECONDS = 3600;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Auth detection (use getUser, not getClaims which doesn't exist) ---
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Skip JWT decode for anon key (it's not a user token)
      if (token !== SUPABASE_ANON_KEY) {
        try {
          const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
          if (!error && user?.id) {
            userId = user.id;
          }
        } catch (authErr) {
          console.warn("Auth check failed, treating as guest:", authErr);
        }
      }
    }

    // --- Rate limiting ---
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitKey = userId
      ? `user:${userId}:analyze-room`
      : `ip:${clientIp}:analyze-room`;
    const maxCalls = userId ? AUTHED_MAX : GUEST_MAX;

    // Use service role key so RLS doesn't block the rate_limits table
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);
    const { data: allowed, error: rlError } = await supabaseAdmin.rpc(
      "check_and_increment_rate_limit",
      {
        p_key: rateLimitKey,
        p_max_calls: maxCalls,
        p_window_seconds: WINDOW_SECONDS,
      }
    );

    if (rlError) {
      console.error("Rate limit check error:", rlError);
      // Fail open to avoid breaking the app on DB issues
    } else if (allowed === false) {
      return new Response(
        JSON.stringify({
          error: userId
            ? "Too many requests. Please wait before trying again."
            : "Guest usage limit reached. Sign in to continue using TidyMind.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageUrl, intent, timeAvailable } = await req.json();

    const systemPrompt = `You are TidyMind, an ADHD-friendly assistant that helps people declutter and organize their spaces. You are encouraging, supportive, and break down tasks into small, achievable micro-challenges.

Analyze the room image and create personalized challenges based on the user's intent.

TASK GENERATION RULES — follow all of these strictly:
1. LOCATION-SPECIFIC: Every task must name the exact location in the room. Not 'put away clothes' but 'pick up the clothes on the left side of the bed'. Not 'clear desk' but 'move the 3 cups on the desk corner to the kitchen'.
2. CATEGORY-GROUPED: Group similar items into one task. If you see 5 clothing items scattered on the floor AND 3 on the bed, make TWO tasks: 'Gather the clothes on the floor into one pile' and 'Move the clothes on the bed to the laundry basket' — NOT one vague task called 'deal with clothes'.
3. SIZE-MATCHED TO TIME: Each task should match its time estimate. A 2-minute task = one small specific action. A 5-minute task = one category in one location. Never assign 10+ minutes to a single task.
4. VISUAL REFERENCE: When possible, describe the item visually so the user can immediately identify it without re-reading. 'The yellow hoodie on the chair' beats 'the hoodie'. 'The pile of papers next to the lamp' beats 'papers'.
5. STARTING TASK = EASIEST WIN: The first task in sort_order must be the single quickest, most visible win in the room. Something achievable in under 2 minutes. This is the activation task — it just needs to get the user moving.
6. MAXIMUM 7 TASKS: Never generate more than 7 tasks. If there is more to do, choose the highest-impact items. Overwhelm kills momentum.
BAD example: 'Tidy up the bedroom' | GOOD example: 'Pick up the 4-5 pieces of clothing from the floor near the door and drop them on the bed for now'
BAD example: 'Organize desk' | GOOD example: 'Clear the right side of the desk — move the cups, wrappers and loose papers off the surface (2 mins)'`;

    const intentDescriptions: Record<string, string> = {
      tidy: "focusing on putting things back in their places and creating a neat appearance",
      declutter: "focusing on identifying items to remove, donate, or discard",
      redesign: "focusing on reorganizing the space for better functionality and aesthetics"
    };

    const userPrompt = `Analyze this room image and create a set of ADHD-friendly micro-challenges for someone who wants to ${intent} their space (${intentDescriptions[intent] || intentDescriptions.tidy}).

${timeAvailable ? `They have approximately ${timeAvailable} minutes available.` : ""}

Create 4-8 specific, actionable challenges. For each challenge, provide:
1. A clear, single-action title (max 8 words)
2. A brief encouraging description (1-2 sentences)
3. Estimated time in minutes (5-10 min each)
4. Points value (10-30 based on effort)

Respond in JSON format:
{
  "roomName": "descriptive name for this space",
  "challenges": [
    {
      "title": "Clear the coffee table",
      "description": "Start with the most visible surface. You've got this!",
      "timeEstimate": 5,
      "points": 15
    }
  ],
  "encouragement": "A brief motivational message for the user"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
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
    const content = data.choices?.[0]?.message?.content;
    
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-room error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
