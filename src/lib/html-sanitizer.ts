/**
 * Simple HTML Sanitizer
 * 
 * Uses linkedom (already in dependencies) for server-side sanitization
 * and DOMParser for client-side sanitization
 */

// Safe HTML tags
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'code', 'pre', 'blockquote',
  'div', 'span', 'hr',
]);

// Safe attributes
const ALLOWED_ATTRIBUTES = new Set(['href', 'target', 'rel', 'title']);

/**
 * Sanitize HTML string by removing dangerous tags and attributes
 * Works in both server and client environments
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Try to use linkedom on server side
  if (typeof window === 'undefined') {
    try {
      return sanitizeHtmlServer(html);
    } catch {
      // Fallback to basic sanitization
      return sanitizeHtmlBasic(html);
    }
  }
  
  // Client-side sanitization using DOMParser
  return sanitizeHtmlClient(html);
}

/**
 * Server-side sanitization using linkedom
 */
function sanitizeHtmlServer(html: string): string {
  // Dynamically import linkedom only on server
  const { parseHTML } = require('linkedom') as any;
  const { document } = parseHTML(html);
  
  // Remove all script tags
  const scripts = document.querySelectorAll('script');
  scripts.forEach((script: any) => script.remove());
  
  // Remove all style tags
  const styles = document.querySelectorAll('style');
  styles.forEach((style: any) => style.remove());
  
  // Remove all event handlers (onclick, onerror, etc.)
  const allElements = document.querySelectorAll('*');
  allElements.forEach((el: any) => {
    const attributes = Array.from(el.attributes || []);
    attributes.forEach((attr: any) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  // Remove dangerous tags
  const dangerousTags = document.querySelectorAll('script, style, iframe, object, embed, form, input, button');
  dangerousTags.forEach((tag: any) => tag.remove());
  
  return document.documentElement?.innerHTML || html;
}

/**
 * Client-side sanitization using DOMParser
 */
function sanitizeHtmlClient(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Remove all script tags
  const scripts = doc.querySelectorAll('script');
  scripts.forEach((script) => script.remove());
  
  // Remove all style tags
  const styles = doc.querySelectorAll('style');
  styles.forEach((style) => style.remove());
  
  // Remove all event handlers
  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    const attributes = Array.from(el.attributes);
    attributes.forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  // Remove dangerous tags
  const dangerousTags = doc.querySelectorAll('script, style, iframe, object, embed, form, input, button');
  dangerousTags.forEach((tag) => tag.remove());
  
  return doc.body.innerHTML;
}

/**
 * Basic fallback sanitization (regex-based)
 * Only used if linkedom fails
 */
function sanitizeHtmlBasic(html: string): string {
  return html
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove event handlers
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs in src attributes
    .replace(/\s+src\s*=\s*["']data:[^"']*["']/gi, ' src=""');
}
