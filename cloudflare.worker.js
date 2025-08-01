// Cloudflare Worker to securely proxy OpenAI API requests
// Replace 'YOUR_OPENAI_API_KEY' with your actual OpenAI API key
// Deploy this code in your Cloudflare Worker dashboard

export default {
  async fetch(request, env, ctx) {
    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Clone the incoming request body
    const body = await request.text();

    // Forward the request to OpenAI API
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer YOUR_OPENAI_API_KEY`,
        },
        body: body,
      }
    );

    // Forward the OpenAI response back to the client
    const responseBody = await openaiResponse.body;
    const responseHeaders = new Headers(openaiResponse.headers);
    // Remove any sensitive headers
    responseHeaders.delete("www-authenticate");
    responseHeaders.delete("set-cookie");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "POST, OPTIONS");

    return new Response(responseBody, {
      status: openaiResponse.status,
      headers: responseHeaders,
    });
  },
};

// CORS preflight support
export const onRequestOptions = async ({ request }) => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
};
