/**
 * Simple markdown parser for workout content
 * Handles basic markdown formatting without external dependencies
 */

export function parseMarkdown(text) {
  if (!text) return '';
  
  let html = text;
  
  // Convert markdown headers to styled HTML
  // ### Header 3
  html = html.replace(/^### (.+)$/gm, (match, p1) => {
    return `<h3 style="font-size: 1.125rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; color: #111827;">${p1}</h3>`;
  });
  
  // ## Header 2
  html = html.replace(/^## (.+)$/gm, (match, p1) => {
    return `<h2 style="font-size: 1.25rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; color: #111827;">${p1}</h2>`;
  });
  
  // Bold text
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');
  
  // Convert line starting with - to list items
  const listItems = [];
  const lines = html.split('\n');
  let inList = false;
  let processedHtml = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('- ')) {
      if (!inList) {
        inList = true;
        processedHtml.push('<ul style="margin: 0.5rem 0; padding-left: 1.5rem; list-style: none;">');
      }
      const content = line.trim().substring(2);
      processedHtml.push(`<li style="margin-bottom: 0.25rem; position: relative;"><span style="position: absolute; left: -1rem;">•</span>${content}</li>`);
    } else {
      if (inList) {
        processedHtml.push('</ul>');
        inList = false;
      }
      processedHtml.push(line);
    }
  }
  
  if (inList) {
    processedHtml.push('</ul>');
  }
  
  html = processedHtml.join('\n');
  
  // Convert newlines to <br> tags, but not within HTML tags
  html = html.replace(/\n(?!<\/?(h[23]|ul|li|strong))/g, '<br />');
  
  // Clean up extra line breaks
  html = html.replace(/(<br \/>){3,}/g, '<br /><br />');
  html = html.replace(/(<h[23][^>]*>)<br \/>/g, '$1');
  html = html.replace(/<br \/>(<\/h[23]>)/g, '$1');
  
  return html;
}

/**
 * Component to render markdown content
 */
export function MarkdownContent({ content, className = '' }) {
  const parsedContent = parseMarkdown(content);
  
  return (
    <div 
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: parsedContent }}
    />
  );
}