/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <div class="product-description">
          <p>${product.description}</p>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

// --- Track selected products in an array for easy access ---
let selectedProducts = [];
let lastRoutine = "";

productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card) return;

  const productName = card.querySelector("h3").textContent;
  const productBrand = card.querySelector("p").textContent;
  const listItemText = `${productName} by ${productBrand}`;

  card.classList.toggle("selected-products");

  if (card.classList.contains("selected-products")) {
    // Add to selectedProducts if not already present
    if (
      !selectedProducts.some(
        (p) => p.name === productName && p.brand === productBrand
      )
    ) {
      selectedProducts.push({
        name: productName,
        brand: productBrand,
        text: listItemText,
      });
    }
  } else {
    // Remove from selectedProducts
    selectedProducts = selectedProducts.filter(
      (p) => !(p.name === productName && p.brand === productBrand)
    );
  }

  // Update the selectedProductsList in the DOM
  selectedProductsList.innerHTML = selectedProducts
    .map((p) => `<li>${p.text}</li>`)
    .join("");
});

/* Chat form submission handler - placeholder for OpenAI integration */
// Add click event listener to the generateRoutine button to fetch the routine
const generateButton = document.getElementById("generateRoutine");
generateButton.addEventListener("click", async (e) => {
  e.preventDefault();
  await fetchRoutine();
});

// Fetch a skincare/makeup routine from OpenAI using selected products
async function fetchRoutine() {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "Please select at least one product to generate a routine.";
    return;
  }

  const productList = selectedProducts.map((p) => p.text).join(", ");

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful skincare and makeup expert that is part of the L'Oréal company. Using the products provided, suggest a simple skincare/makeup routine for them using only the products provided, with an emphasis on those specifically selected by the user. If they should add other steps, suggest them and point them to the appropriate products, preferably ones with the L'Oreal brand. If L'Oréal has products that could replace the ones not of the same brand that are selected, you can suggest more on brand ones, but if L'Oreal products are not available, you can suggest alternatives from other brands. You give routine steps in a list format. You have a deep understanding of skincare and makeup routines, and you can provide personalized advice based on the products available and any other information such as skin type as given. You have a smart and fun personality like a makeup artist friend.",
    },
    {
      temperature: 0.7,
      max_tokens: 350,
    },
    {
      role: "user",
      content: `Here are the products I have: ${productList}. Please create a step-by-step routine using only these products.`,
    },
  ];

  chatWindow.innerHTML = "Generating your routine...";

  try {
    const response = await fetch(
      "https://blue-boat-3b65.ashagirl409.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: messages,
        }),
      }
    );

    const data = await response.json();
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      chatWindow.innerHTML = data.choices[0].message.content;
      lastRoutine = data.choices[0].message.content;
    } else {
      chatWindow.innerHTML =
        "Sorry, I couldn't generate a routine. Please try again.";
    }
  } catch (error) {
    console.error("Error fetching routine:", error);
    chatWindow.innerHTML = "Failed to fetch routine. Please try again.";
  }
}

const submitButton = document.getElementById("sendBtn");
const chatInput = document.getElementById("chatInput");

submitButton.addEventListener("click", (e) => {
  e.preventDefault();
  const userInput = chatInput.value.trim();
  if (!userInput) return;

  // Build context for the chat: include last routine and selected products
  let contextMsg = "";
  if (lastRoutine) {
    contextMsg += `Here is the routine you suggested earlier: ${lastRoutine}\n`;
  }
  if (selectedProducts.length > 0) {
    contextMsg += `The user has selected these products: ${selectedProducts
      .map((p) => p.text)
      .join(", ")}.\n`;
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful, smart, and friendly makeup artist assistant that is communicating with a user on their inquiries about skincare and makeup routines. You provide personalized advice based on the products available and any other information such as skin type as given. You have a smart and fun personality like a makeup artist friend, and you answer any follow up questions they may have about the products they have or have not selected.",
    },
    {
      temperature: 0.8,
      max_tokens: 350,
    },
    {
      role: "user",
      content: `${contextMsg} ${userInput}`,
    },
  ];

  chatWindow.innerHTML = "Thinking...";

  async function fetchResponse() {
    const response = await fetch(
      "https://blue-boat-3b65.ashagirl409.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: messages,
        }),
      }
    );

    const data = await response.json();
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      chatWindow.innerHTML = data.choices[0].message.content;
    } else {
      chatWindow.innerHTML = "Sorry, I couldn't generate a response.";
    }
  }
  fetchResponse();
});
