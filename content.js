console.log("🧪 content.js loaded!");

// Ensure we only initialize once
if (!window.summarizerInitialized) {
  window.summarizerInitialized = true;
  
  console.log("Initializing Web Summarizer content script...");
  
  // Get API key from storage or use a placeholder
  let apiKey = '';
  
  // Function to load saved API key from Chrome storage
  function loadApiKey() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(['geminiApiKey'], function(result) {
          if (result.geminiApiKey) {
            apiKey = result.geminiApiKey;
            console.log("API key loaded from storage");
          }
          resolve(apiKey);
        });
      } else {
        apiKey = localStorage.getItem('geminiApiKey') || '';
        console.log("API key loaded from localStorage");
        resolve(apiKey);
      }
    });
  }
  
  // Function to save API key to storage
  function saveApiKey(key) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({geminiApiKey: key}, function() {
        console.log("API key saved to Chrome storage");
      });
    } else {
      localStorage.setItem('geminiApiKey', key);
      console.log("API key saved to localStorage");
    }
    apiKey = key;
  }
  
  // Function to load widget state
  function loadWidgetState() {
    return localStorage.getItem('summarizerWidgetOpen') === 'true';
  }
  
  // Function to save widget state
  function saveWidgetState(isOpen) {
    localStorage.setItem('summarizerWidgetOpen', isOpen.toString());
  }
  
  // Make sure we have access to PDF.js library
  if (typeof pdfjsLib !== 'undefined') {
    try {
      // Setup PDF.js worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.js');
      console.log("PDF.js worker configured successfully");
    } catch (err) {
      console.error("Error configuring PDF.js worker:", err);
    }
  } else {
    console.warn("PDF.js library not available - PDF functionality will be limited");
  }
  
  // == FONT IMPORT ==
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);

  // Load CSS file
  const cssLink = document.createElement('link');
  cssLink.href = chrome.runtime.getURL('styles.css');
  cssLink.rel = 'stylesheet';
  document.head.appendChild(cssLink);
  
  // Create toggle button and append it to body
  function createToggleButton() {
    // == FLOATING ICON BUTTON ==
    const toggleButton = document.createElement('div');
    toggleButton.id = 'summarizerToggle';
    toggleButton.title = 'Toggle AI Summarizer';
    toggleButton.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;
    
    document.body.appendChild(toggleButton);
    console.log("Toggle button created and appended to body");
    return toggleButton;
  }
  
  // Create overlay for click-outside-to-close functionality
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'summarizerOverlay';
    document.body.appendChild(overlay);
    return overlay;
  }
  
  // Create widget and append it to body
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = 'summarizerWidget';
    widget.innerHTML = `
      <div id="summarizerHeader">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <line x1="10" y1="9" x2="8" y2="9"></line>
        </svg>
        AI Summarizer
      </div>
      <div id="apiKeySection">
        <div style="display: flex; flex-direction: column;">
          <div class="api-key-field-wrapper">
            <input type="password" id="apiKeyInput" name="geminiApiKey" placeholder="Enter your Gemini API key" aria-label="Gemini API Key">
            <button id="togglePassword" type="button" aria-label="Toggle password visibility">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
          <button id="saveApiKeyBtn">Save API Key</button>
          <div id="apiKeyStatus"></div>
          <div id="apiKeyHelp">
            Need an API key? <a href="https://ai.google.dev/tutorials/setup" id="getApiKeyLink" target="_blank" rel="noopener noreferrer">Get a Gemini API key</a>
          </div>
        </div>
      </div>
      <pre id="summarizerContent">Click "Summarize" to get an AI-powered summary of this page.</pre>
      <div id="spinner">
        <div class="spinner"></div>
      </div>
      <button id="summarizeBtn">Summarize</button>
    `;
    document.body.appendChild(widget);
    console.log("Widget created and appended to body");
    return widget;
  }
  
  // Helper to fetch and extract text from PDF using PDF.js
  async function fetchAndExtractPDFText(pdfUrl) {
    console.log("Attempting to extract text from PDF:", pdfUrl);
    
    // Check if PDF.js is available
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("PDF.js library not found");
    }
    
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error("Failed to fetch PDF");
    
    const arrayBuffer = await response.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += pageText + "\n\n";
    }
    
    return fullText;
  }
  
  // Extract main body text from webpage
  function extractMainBodyText() {
    // Grab all the text from the body
    const bodyText = document.body.innerText || "";
  
    // Split by newlines and trim each line
    const lines = bodyText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0); // remove empty lines
  
    // Filter lines with more than 10 words
    const filteredLines = lines.filter(line => {
      const wordCount = line.split(/\s+/).length;
      return wordCount > 10;
    });
  
    return filteredLines.join("\n\n"); // Join the array into a string with double newlines
  }

  // Function to show and hide spinner
  function showSpinner() {
    const spinner = document.getElementById('spinner');
    const summaryText = document.getElementById('summarizerContent');
    const summarizeBtn = document.getElementById('summarizeBtn');
    
    if (spinner) {
      spinner.style.display = 'block';
    }
    
    if (summaryText) {
      summaryText.style.opacity = '0.5';
      summaryText.textContent = 'Analyzing page content';
      summaryText.classList.add('loading-text');
    }
    
    if (summarizeBtn) {
      summarizeBtn.disabled = true;
      summarizeBtn.textContent = 'Summarizing...'
    }
  }
  
  function hideSpinner() {
    const spinner = document.getElementById('spinner');
    const summaryText = document.getElementById('summarizerContent');
    const summarizeBtn = document.getElementById('summarizeBtn');
    
    if (spinner) {
      spinner.style.display = 'none';
    }
    
    if (summaryText) {
      summaryText.style.opacity = '1';
      summaryText.classList.remove('loading-text');
    }
    
    if (summarizeBtn) {
      summarizeBtn.disabled = false;
      summarizeBtn.classList.remove('loading');
      summarizeBtn.textContent = 'Summarize';
    }
  }

  // Function to handle API key visibility toggle
  function setupPasswordToggle() {
    const toggleButton = document.getElementById('togglePassword');
    const apiKeyInput = document.getElementById('apiKeyInput');
    
    if (toggleButton && apiKeyInput) {
      toggleButton.addEventListener('click', function() {
        // Toggle between password and text
        const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
        apiKeyInput.setAttribute('type', type);
        
        // Update the icon
        this.innerHTML = type === 'password' ? 
          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>` : 
          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>`;
      });
    }
  }

  // Function to show/hide widget with proper state management
  function toggleWidget() {
    const widget = document.getElementById('summarizerWidget');
    const overlay = document.getElementById('summarizerOverlay');
    const isVisible = widget.classList.contains('visible');
    
    if (isVisible) {
      // Hide widget
      hideWidget();
    } else {
      // Show widget
      showWidget();
    }
  }
  
  function showWidget() {
    const widget = document.getElementById('summarizerWidget');
    const overlay = document.getElementById('summarizerOverlay');
    
    overlay.style.display = 'block';
    widget.style.display = 'flex';
    
    // Force reflow
    void widget.offsetWidth;
    
    overlay.classList.add('visible');
    widget.classList.add('visible');
    
    saveWidgetState(true);
  }
  
  function hideWidget() {
    const widget = document.getElementById('summarizerWidget');
    const overlay = document.getElementById('summarizerOverlay');
    
    overlay.classList.remove('visible');
    widget.classList.remove('visible');
    
    setTimeout(() => {
      if (!widget.classList.contains('visible')) {
        widget.style.display = 'none';
        overlay.style.display = 'none';
      }
    }, 300);
    
    saveWidgetState(false);
  }

  // Function to mask API key for display
  function maskApiKey(key) {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  }

  // Wait a short time to ensure DOM is fully loaded and stable
  setTimeout(() => {
    try {
      const toggleButton = createToggleButton();
      const overlay = createOverlay();
      const widget = createWidget();
      
      // Setup password visibility toggle
      setupPasswordToggle();
      
      // Get references to widget elements
      const summarizeBtn = document.getElementById('summarizeBtn');
      const summaryText = document.getElementById('summarizerContent');
      const apiKeyInput = document.getElementById('apiKeyInput');
      const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
      const apiKeyStatus = document.getElementById('apiKeyStatus');
      const getApiKeyLink = document.getElementById('getApiKeyLink');
      
      if (!summarizeBtn || !summaryText || !apiKeyInput || !saveApiKeyBtn || !apiKeyStatus) {
        console.error("Failed to get references to widget elements");
        return;
      }

      // Load saved API key if it exists
      loadApiKey().then(savedKey => {
        if (savedKey) {
          // Show masked API key
          apiKeyInput.value = maskApiKey(savedKey);
          apiKeyStatus.textContent = '✓ API key is configured';
          apiKeyStatus.className = 'status-success';
        } else {
          apiKeyStatus.textContent = 'Please enter your Gemini API key';
          apiKeyStatus.className = 'status-warning';
        }
      });
      
      // Restore widget state
      if (loadWidgetState()) {
        showWidget();
      }
      
      saveApiKeyBtn.addEventListener('click', () => {
        const currentInputValue = apiKeyInput.value.trim();

        // Scenario 1: User types a brand new, unmasked key
        if (currentInputValue && !currentInputValue.includes('*')) {
          // Basic validation: check if it looks like a valid key (e.g., length, characters)
            // You might want a more robust validation here, e.g., checking for specific prefixes
            if (currentInputValue.length < 30) { // Gemini API keys are typically long
                apiKeyStatus.textContent = 'Please enter a valid API key (too short)';
                apiKeyStatus.className = 'status-error';
                return; // Stop execution if invalid
            }

          saveApiKey(currentInputValue); // Save the actual new key
          apiKeyStatus.textContent = '✓ API key saved successfully!';
          apiKeyStatus.className = 'status-success';
          
          // Mask it immediately after saving for display
          apiKeyInput.value = maskApiKey(currentInputValue);
          apiKeyInput.setAttribute('type', 'password'); // Hide it again

        // Scenario 2: User clicks save while a masked key is displayed
        } else if (currentInputValue.includes('*')) {
          apiKeyStatus.textContent = 'API key is already configured (edit to change)'; // More informative message
          apiKeyStatus.className = 'status-success'; // Still a success state, as it IS configured

        // Scenario 3: Input is empty or invalid (e.g., just spaces)
        } else {
          apiKeyStatus.textContent = 'Please enter your Gemini API key to save.';
          apiKeyStatus.className = 'status-error';
        }
      });
      
      // Handle Enter key in API key input
      apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          saveApiKeyBtn.click();
        }
      });
      
      // Help link click handler
      if (getApiKeyLink) {
        getApiKeyLink.addEventListener('click', (e) => {
          console.log("API key help link clicked");
        });
      }
      
      // == TOGGLE WIDGET VISIBILITY WITH ANIMATION ==
      toggleButton.addEventListener('click', toggleWidget);
      
      // Click outside to close
      overlay.addEventListener('click', hideWidget);
      
      // Prevent widget clicks from closing the overlay
      widget.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      // == SUMMARIZATION LOGIC ==
      summarizeBtn.addEventListener('click', async () => {
        // Check if API key is set
        if (!apiKey) {
          summaryText.textContent = 'Please enter and save your Gemini API key first.';
          summaryText.classList.remove('fade-in');
          apiKeyStatus.textContent = 'API key required';
          apiKeyStatus.className = 'status-error';
          apiKeyInput.focus();
          return;
        }
        
        showSpinner();
        summarizeBtn.disabled = true;
        
        try {
          let pageText;
          
          if (window.location.href.endsWith('.pdf')) {
            pageText = await fetchAndExtractPDFText(window.location.href);
            console.log("PDF detected and processed");
          } else {
            pageText = extractMainBodyText();
            console.log("Webpage content extracted");
          }
          
          if (!pageText || pageText.trim().length < 100) {
            throw new Error("Unable to extract sufficient content from this page");
          }
          
          // Truncate text to avoid huge requests
          const truncatedText = pageText.slice(0, 8000);
          const prompt = `What are the main takeaways from this webpage? Generate them in bullet points, make it 1-2 sentences for each. Use a little bit of emojis and make it comprehensible to someone with at least a 9th grade education.\n\n${truncatedText}`;
          
          console.log("Sending summarization request to Gemini API...");
          
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
              }),
            }
          );
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData?.error?.message || `API request failed with status ${res.status}`);
          }
          
          const data = await res.json();
          
          // Check for API errors
          if (data.error) {
            throw new Error(data.error.message || 'API error occurred');
          }
          
          const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          
          hideSpinner();
          summarizeBtn.disabled = false;
          
          // Display the summary with fade-in effect
          if (summary) {
            summaryText.textContent = summary;
            summaryText.classList.add('fade-in');
            
            // Scroll to top of content
            summaryText.scrollTop = 0;
          } else {
            summaryText.textContent = 'No summary returned. The page content might be too short or the API might be experiencing issues. Please try again.';
            summaryText.classList.add('fade-in');
          }
          
          console.log("Summarization complete");
          
        } catch (err) {
          hideSpinner();
          summarizeBtn.disabled = false;
          
          console.error("Summarization error:", err);
          
          // Check for API key related errors
          if (err.message && (
              err.message.includes('API key') || 
              err.message.includes('authentication') || 
              err.message.includes('unauthorized') ||
              err.message.includes('403') ||
              err.message.includes('invalid')
            )) {
            summaryText.textContent = `❌ API Key Error: ${err.message}\n\nPlease check that your API key is valid and has the necessary permissions.`;
            apiKeyStatus.textContent = 'Invalid or unauthorized API key';
            apiKeyStatus.className = 'status-error';
          } else if (err.message.includes('quota') || err.message.includes('limit')) {
            summaryText.textContent = `⚠️ Rate Limit: ${err.message}\n\nYou've exceeded your API quota. Please try again later or check your Gemini API usage.`;
          } else if (err.message.includes('network') || err.message.includes('fetch')) {
            summaryText.textContent = `🌐 Network Error: Unable to connect to the API.\n\nPlease check your internet connection and try again.`;
          } else {
            summaryText.textContent = `❌ Error: ${err.message}\n\nIf this persists, please check your API key and try again.`;
          }
          
          summaryText.classList.add('fade-in');
        }
      });
      
      // Handle Enter key in summarize button
      summarizeBtn.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!summarizeBtn.disabled) {
            summarizeBtn.click();
          }
        }
      });
      
      // Handle Escape key to close widget
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && widget.classList.contains('visible')) {
          hideWidget();
        }
      });
      
      // Handle window resize for responsive behavior
      window.addEventListener('resize', () => {
        if (widget.classList.contains('visible')) {
          // Reposition widget if it goes off screen
          const rect = widget.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          if (rect.right > viewportWidth || rect.bottom > viewportHeight) {
            // Widget might be off screen, let CSS handle responsive positioning
            widget.style.right = '';
            widget.style.bottom = '';
          }
        }
      });
      
      // Add ARIA labels and roles for better accessibility
      widget.setAttribute('role', 'dialog');
      widget.setAttribute('aria-label', 'AI Summarizer Widget');
      toggleButton.setAttribute('role', 'button');
      toggleButton.setAttribute('aria-label', 'Toggle AI Summarizer');
      
      // Set focus management
      const focusableElements = widget.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );
      
      // Focus trap within widget when open
      if (focusableElements.length > 0) {
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        widget.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            if (e.shiftKey) {
              // Shift + Tab
              if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
              }
            } else {
              // Tab
              if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
              }
            }
          }
        });
      }
      
      // Performance optimization: throttle resize events
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          // Handle any resize-specific logic here
          console.log('Window resized, checking widget position');
        }, 150);
      });
      
      console.log("Web Summarizer initialization complete with enhanced UI");
      
    } catch (err) {
      console.error("Error initializing Web Summarizer:", err);
      
      // Show user-friendly error if initialization fails
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fee2e2;
        color: #dc2626;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        z-index: 2147483647;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      errorDiv.textContent = 'AI Summarizer failed to initialize. Please refresh the page.';
      document.body.appendChild(errorDiv);
      
      // Auto-remove error message after 5 seconds
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 5000);
    }
  }, 500); // Short delay to ensure DOM is stable
}