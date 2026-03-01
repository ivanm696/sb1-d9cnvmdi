import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const systemPrompts: Record<string, string> = {
  default: "You are a helpful AI assistant. Provide concise and useful responses.",
  coding: "You are an expert coding assistant. Help users with programming questions and code examples.",
  writing: "You are a professional writing assistant. Help improve and refine written content.",
  analysis: "You are a data analysis expert. Help interpret and analyze information.",
};

interface RequestPayload {
  message: string;
  tokenId: string;
  userId: string;
  mode?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, tokenId, userId, mode = "default" }: RequestPayload = await req.json();

    if (!message || !tokenId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const systemPrompt = systemPrompts[mode] || systemPrompts.default;

    const responses: Record<string, string> = {
      default: `I understand you're asking: "${message}". I'm ready to help with any questions or tasks. In a full implementation, this would be connected to an AI service like OpenAI's API or Anthropic's Claude API. For now, I can provide helpful information based on your request.`,
      coding: `Regarding your coding question about "${message}": This is a great question! In a production environment, I would provide specific code examples and explanations. The key concepts are important to understand before implementing.`,
      writing: `For your writing request about "${message}": I can help improve this. The approach should focus on clarity, conciseness, and impact. Would you like me to suggest specific improvements?`,
      analysis: `Analyzing your request about "${message}": This is an interesting question. To provide the best analysis, I would need more context or data. In a full implementation, I could process and analyze various data formats.`,
    };

    const reply =
      responses[mode] || responses.default;

    return new Response(
      JSON.stringify({
        reply,
        usage: {
          input_tokens: message.length,
          output_tokens: reply.length,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        error: `Assistant error: ${errorMessage}`,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
