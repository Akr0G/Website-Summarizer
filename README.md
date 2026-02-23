# AI Summarizer (Powered by Gemini API)

A browser-based Chrome extension that leverages Google’s Gemini API to generate concise, structured summaries of web pages and PDFs directly within the browser.

---

## Overview

AI Summarizer is designed to improve digital reading efficiency by providing fast, high-quality summaries of long-form content. Unlike simple API wrappers, this project focuses heavily on preprocessing and structured input control to improve model performance and reliability.

The system extracts visible webpage content, applies heuristic filtering to remove low-value noise, manages model input limits, and renders results in a floating in-browser UI.

> Note: This repository is private and intended for demonstration purposes only.

---

## System Architecture

The extension follows a structured:

**Input → Preprocessing → Prompt Construction → Model → UI Rendering**

### 1. DOM Extraction
- Uses `document.body.innerText` to extract visible webpage text  
- Ignores script and style elements  
- Processes only rendered content  

### 2. Heuristic Noise Filtering
To improve summary quality, the system applies lightweight preprocessing:

- Splits content by newline  
- Trims whitespace  
- Removes empty lines  
- Filters out lines with fewer than 10 words (content-density heuristic)  
- Reduces navigation clutter, ads, and short UI fragments  

This improves signal-to-noise ratio before passing input to the model.

### 3. PDF Support (via PDF.js)
If the active page is a PDF:
- Fetches file as an ArrayBuffer  
- Uses PDF.js to extract text page-by-page  
- Aggregates structured text for summarization  

This enables summarization of research papers and long-form reports.

### 4. Input Length Control
To manage model constraints:
- Input text is truncated to 8,000 characters  
- Prevents token overflow  
- Improves response stability and performance  

### 5. Structured Prompt Engineering
Prompts are constructed to enforce:
- Bullet-point formatting  
- 1–2 sentence explanations  
- Clear readability (approx. 9th-grade level)  
- Controlled tone  

Prompt iterations were refined to reduce redundancy and improve clarity.

### 6. Gemini API Integration
- Uses Gemini 1.5 Flash endpoint  
- Secure API key handling via `chrome.storage.sync`  
- Local fallback using `localStorage`  
- Detailed error handling for:
  - Authentication errors  
  - Invalid keys  
  - Rate limits  
  - Network failures  

### 7. UI & State Management
- Floating toggle button injected into DOM  
- Modal-style overlay with click-outside-to-close behavior  
- Persistent widget state across sessions  
- Loading spinner with disabled button state  
- Copy-to-clipboard functionality  

---

## Accessibility Features

- ARIA roles and labels  
- Keyboard navigation support  
- Focus trapping inside modal  
- Escape key close functionality  
- Responsive handling on window resize  

---

## Key Features

- Summarizes full webpages using Gemini API  
- Extracts visible DOM content only  
- Heuristic filtering for cleaner model input  
- PDF summarization support  
- Token-length management  
- Structured prompt design  
- Secure client-side API key storage  
- Real-time error classification and feedback  
- Fully client-side (no backend, no tracking)  

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript  
- **Platform:** Chrome Extension APIs  
- **AI Integration:** Google Gemini 1.5 Flash  
- **PDF Parsing:** PDF.js  
- **Core Concepts:**  
  - DOM manipulation  
  - Heuristic content filtering  
  - Prompt engineering  
  - Token management  
  - Client-side state persistence  

---

## My Contributions

- Designed full extension architecture  
- Implemented DOM extraction and filtering pipeline  
- Built PDF text extraction logic using PDF.js  
- Engineered structured summarization prompts  
- Integrated Gemini API with robust error handling  
- Implemented token-length safeguards  
- Designed floating UI with accessibility support  
- Built secure API key storage and masking logic  

---

## Limitations

- Heuristic filtering does not perfectly isolate primary article content  
- Long documents require truncation due to model token limits  
- No semantic ranking or NLP-based content scoring  
- Summary quality depends on model output behavior  

---

## Future Improvements

- Semantic content scoring to improve article extraction  
- Multi-chunk summarization for longer documents  
- Adjustable summary depth (brief vs. detailed modes)  
- Model comparison across multiple LLM providers  
- Optional keyword-based summarization  

---

## Demo

A demo GIF or video walkthrough will be added soon.

---

## Access

If you are a college admissions officer, researcher, or recruiter and would like access to the full repository, please contact me for collaborator access.

---

## Contact

- **Email:** gajula.akhil13@gmail.com  
- **GitHub:** https://github.com/Akr0G  
