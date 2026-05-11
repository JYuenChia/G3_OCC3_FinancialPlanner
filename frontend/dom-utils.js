/**
 * DOM Utilities Module
 * Provides safe DOM manipulation functions to prevent XSS vulnerabilities
 * Uses native DOM APIs without external dependencies
 */

/**
 * Safely creates an element with classes and text content
 * @param {string} tag - HTML tag name (e.g., 'div', 'a', 'span')
 * @param {Object} options - Configuration options
 * @param {string} options.text - Text content (safe, no HTML)
 * @param {Array<string>} options.classes - CSS classes to add
 * @param {Object} options.attributes - Attributes to set (key-value pairs)
 * @param {Object} options.data - Data attributes (auto-prefixed with 'data-')
 * @returns {HTMLElement} - Created element
 */
function createSafeElement(tag, options = {}) {
  const element = document.createElement(tag);

  // Add classes if provided
  if (options.classes && Array.isArray(options.classes)) {
    element.classList.add(...options.classes);
  }

  // Set text content safely (no HTML injection)
  if (options.text) {
    element.textContent = options.text;
  }

  // Set attributes safely
  if (options.attributes && typeof options.attributes === 'object') {
    Object.entries(options.attributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        element.setAttribute(key, value);
      }
    });
  }

  // Set data attributes
  if (options.data && typeof options.data === 'object') {
    Object.entries(options.data).forEach(([key, value]) => {
      element.dataset[key] = value;
    });
  }

  return element;
}

/**
 * Safely appends text to an element
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text to append (safe, no HTML)
 */
function appendSafeText(element, text) {
  if (element && text) {
    const textNode = document.createTextNode(text);
    element.appendChild(textNode);
  }
}

/**
 * Safely creates a list of elements from an array of data
 * Used for rendering multiple items (news, recommendations, goals, etc.)
 * @param {Array} items - Array of data objects
 * @param {Function} renderFunction - Function that returns {tag, options} for each item
 * @returns {DocumentFragment} - Fragment containing all created elements
 */
function createSafeElementList(items, renderFunction) {
  const fragment = document.createDocumentFragment();

  if (!Array.isArray(items)) {
    return fragment;
  }

  items.forEach((item, index) => {
    try {
      const config = renderFunction(item, index);
      if (config && config.tag) {
        const element = createSafeElement(config.tag, config.options);
        fragment.appendChild(element);
      }
    } catch (error) {
      console.error('Error rendering item:', error, item);
    }
  });

  return fragment;
}

/**
 * Safely renders a list of items into a container
 * Clears the container and replaces with new safe content
 * @param {HTMLElement} container - Target container to populate
 * @param {Array} items - Array of data objects
 * @param {Function} renderFunction - Function that returns {tag, options} for each item
 */
function renderSafeList(container, items, renderFunction) {
  if (!container) {
    console.warn('Container element not found');
    return;
  }

  // Clear container
  container.innerHTML = '';

  if (!items || items.length === 0) {
    return;
  }

  const fragment = createSafeElementList(items, renderFunction);
  container.appendChild(fragment);
}

/**
 * Safely validates and sanitizes URLs
 * Prevents javascript: and data: protocols
 * @param {string} url - URL to validate
 * @param {string} defaultUrl - Fallback URL if invalid (default: '#')
 * @returns {string} - Safe URL
 */
function sanitizeUrl(url, defaultUrl = '#') {
  if (!url || typeof url !== 'string') {
    return defaultUrl;
  }

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
    return defaultUrl;
  }

  return url;
}

/**
 * Safely escapes text for display (not needed if using textContent, but useful for reference)
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Safely renders HTML that needs formatting (like progress bars)
 * Only allows specific safe tags and removes all event handlers
 * Use sparingly and only for controlled content
 * @param {string} html - HTML string to render
 * @param {HTMLElement} container - Container to render into
 */
function renderSafeHtml(container, html) {
  if (!container || !html) {
    return;
  }

  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove all script tags and event listeners
  const scripts = temp.querySelectorAll('script');
  scripts.forEach((script) => script.remove());

  // Remove all event attributes
  const allElements = temp.querySelectorAll('*');
  allElements.forEach((element) => {
    const attributes = Array.from(element.attributes);
    attributes.forEach((attr) => {
      if (attr.name.startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    });
  });

  container.innerHTML = '';
  container.appendChild(temp);
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSafeElement,
    appendSafeText,
    createSafeElementList,
    renderSafeList,
    sanitizeUrl,
    escapeHtml,
    renderSafeHtml,
  };
}
