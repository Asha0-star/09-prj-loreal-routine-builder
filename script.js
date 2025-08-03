// Get references to DOM elements
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateButton = document.getElementById("generateRoutine");
const submitButton = document.getElementById("sendBtn");
const chatInput = document.getElementById("chatInput");

// State
let selectedProducts = [];
let lastRoutine = "";

// Helper function to save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

// Helper function to load selected products from localStorage
function loadSelectedProducts() {
  const data = localStorage.getItem("selectedProducts");
  if (data) {
    try {
      selectedProducts = JSON.parse(data);
    } catch (e) {
      selectedProducts = [];
    }
  }
}

// Helper function to update the selected products list in the UI
function renderSelectedProductsList() {
  selectedProductsList.innerHTML = selectedProducts
    .map((p) => `<li>${p.text}</li>`)
    .join("");
}

// On page load, restore selected products from localStorage
loadSelectedProducts();
renderSelectedProductsList();

// Show initial placeholder
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

// Load product JSON
async function loadProducts() {
  const res = await fetch("products.json");
  if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
  const data = await res.json();
  return data.products;
}

// Render product cards
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found for this category.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      // Check if this product is already selected
      const text = `${product.name} by ${product.brand}`;
      const isSelected = selectedProducts.some((p) => p.text === text);
      return `
      <div class="product-card${isSelected ? " selected-products" : ""}">
        <img src="${product.image}" alt="${product.name}" />
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
          <div class="product-description">
            <p>${product.description}</p>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

// When category changes, fetch+filter+render
categoryFilter.addEventListener("change", async (e) => {
  const all = await loadProducts();
  const filtered = all.filter((p) => p.category === e.target.value);
  displayProducts(filtered);
});

// Handle clicks on product cards (select/unselect)
productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card) return;

  const name = card.querySelector("h3").textContent;
  const brand = card.querySelector("p").textContent;
  const text = `${name} by ${brand}`;

  card.classList.toggle("selected-products");

  if (card.classList.contains("selected-products")) {
    if (!selectedProducts.some((p) => p.text === text)) {
      selectedProducts.push({ name, brand, text });
    }
  } else {
    selectedProducts = selectedProducts.filter((p) => p.text !== text);
  }

  renderSelectedProductsList();
  saveSelectedProducts();
});

// Click “Generate Routine” → build prompt & call OpenAI
generateButton.addEventListener("click", async (e) => {
  e.preventDefault();

  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "Please select at least one product to generate a routine.";
    return;
  }

  chatWindow.innerHTML = "Generating your routine…";
  const productList = selectedProducts.map((p) => p.text).join(", ");
  const routine = await fetchRoutine(productList);

  chatWindow.innerHTML = routine || "Sorry, I couldn’t generate a routine.";
});

// Helper to call your Cloudflare Worker for the initial routine
// This keeps your OpenAI API key safe and avoids CORS issues
async function fetchRoutine(productList) {
  // Build the messages array for the OpenAI API
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful, professional skincare and makeup expert from L'Oreal. Only use the products provided by the user to create a step-by-step beauty routine. If the user needs more information, ask them for details about their skin type, concerns, or preferences. Feel free to suggest other products from the products provided if necessary (i.e. the user should incorporate a step for sunscreen, but they didn't select one). Use emojis to make it fun and engaging.",
    },
    {
      role: "user",
      content: `Here are the products I have: ${productList}. Please create a step-by-step routine using only these products.`,
    },
  ];

  try {
    // Call your Cloudflare Worker endpoint (acts as a backend proxy)
    const res = await fetch("https://blue-boat-3b65.ashagirl409.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 400, // Limit the response to 400 tokens
        temperature: 0.7, // Add some creativity to the response
      }),
    });
    if (!res.ok) throw new Error(`Cloudflare Worker error ${res.status}`);
    const { choices } = await res.json();
    const content = choices?.[0]?.message?.content || "";
    lastRoutine = content;
    return content;
  } catch (err) {
    console.error("fetchRoutine()", err);
    return null;
  }
}

// Get reference to the chat form (assumes <form id="chatForm"> in HTML)
const chatForm = document.getElementById("chatForm");

// Function to handle chat follow-up using the Cloudflare Worker
async function handleChatFollowUp(e) {
  e.preventDefault(); // Prevent form submission or page reload

  // Get the user's input from the chat input box (should match the input's id in index.html)
  const userInput = document.getElementById("userInput").value.trim();
  if (!userInput) return;

  // Build context from last routine and selected products
  let context = "";
  if (lastRoutine) {
    context += `Here is the routine you suggested earlier: ${lastRoutine}\n`;
  }
  if (selectedProducts.length) {
    context += `The user has selected these products: ${selectedProducts
      .map((p) => p.text)
      .join(", ")}.\n`;
  }

  // Prepare the messages array for the API
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful, smart, and friendly makeup artist assistant. You provide personalized advice based on the products available and any other information such as skin type. You have a fun personality like a makeup-artist friend, and you answer follow-up questions about their selected products.",
    },
    {
      role: "user",
      content: `${context}${userInput}`,
    },
  ];

  chatWindow.innerHTML = "Thinking…";

  try {
    // Call your Cloudflare Worker endpoint (acts as a backend proxy)
    const res = await fetch("https://blue-boat-3b65.ashagirl409.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
      }),
    });
    if (!res.ok) throw new Error(`Cloudflare Worker error ${res.status}`);
    const { choices } = await res.json();
    chatWindow.innerHTML =
      choices?.[0]?.message?.content ||
      "Sorry, I couldn’t generate a response.";
  } catch (err) {
    console.error("handleChatFollowUp()", err);
    chatWindow.innerHTML = "Failed to fetch response. Please try again.";
  }
  // Optionally clear the chat input after sending
  document.getElementById("userInput").value = "";
}

// Connect the function to the chat form submit event
if (chatForm) {
  submitButton.addEventListener("click", handleChatFollowUp);
}
