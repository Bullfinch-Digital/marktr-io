import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function corsPreflight(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  return null;
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return json(
        {
          error:
            "OPENAI_API_KEY missing. Set it via `supabase secrets set OPENAI_API_KEY=...` and redeploy.",
        },
        500
      );
    }

    const formData = await req.formData();
    const audio = formData.get("file");

    if (!(audio instanceof File)) {
      return json({ error: "Missing audio file in multipart form field 'file'." }, 400);
    }

    if (audio.size === 0) {
      return json({ error: "Audio file is empty." }, 400);
    }

    const openAiForm = new FormData();
    openAiForm.append("model", "whisper-1");
    openAiForm.append("response_format", "text");
    openAiForm.append("file", audio, audio.name || "recording.webm");

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openAiForm,
    });

    const text = await resp.text();

    if (!resp.ok) {
      return json(
        {
          error: "OpenAI transcription failed",
          status: resp.status,
          details: text,
        },
        500
      );
    }

    return json({ transcript: text.trim() });
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
