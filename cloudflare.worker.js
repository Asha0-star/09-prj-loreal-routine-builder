/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Cloudflare Worker to proxy requests to OpenAI API

addEventListener("fetch", (event) => {
  // Listen for fetch events (HTTP requests)
  const { request } = event;
  if (request.method === "OPTIONS") {
    // Handle CORS preflight requests
    event.respondWith(
      new Response(null, {
        status: 204,
        headers: corsHeaders(),
      })
    );
  } else {
    // Handle POST requests
    event.respondWith(handleRequest(request));
  }
});

// Main handler function for POST requests
async function handleRequest(request) {
  if (request.method !== "POST") {
    // Only allow POST requests
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders(),
    });
  }

  // Check for OpenAI API key
  if (typeof OPENAI_API_KEY === "undefined" || !OPENAI_API_KEY) {
    // Return error if API key is missing
    return new Response(
      JSON.stringify({ error: "Missing OPENAI_API_KEY environment variable." }),
      {
        status: 500,
        headers: corsHeaders({
          "Content-Type": "application/json",
        }),
      }
    );
  }

  try {
    const openaiUrl = "https://api.openai.com/v1/chat/completions";
    const apiKey = OPENAI_API_KEY;

    // Read the request body as text
    const body = await request.text();

    // Forward the request to OpenAI API
    const response = await fetch(openaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });

    // Read the response from OpenAI API
    const responseBody = await response.text();

    // Return the response to the client
    return new Response(responseBody, {
      status: response.status,
      headers: corsHeaders({
        "Content-Type": "application/json",
      }),
    });
  } catch (err) {
    // Return error if something goes wrong
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: corsHeaders({
        "Content-Type": "application/json",
      }),
    });
  }
}

// Helper function to set CORS headers
function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extra,
  };
}
