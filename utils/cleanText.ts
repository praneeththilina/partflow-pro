// Utility function to clean text from newline characters
export const cleanText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\\n/g, ' ')      // Replace literal "\n" strings
    .replace(/\\r/g, ' ')      // Replace literal "\r" strings  
    .replace(/\\t/g, ' ')      // Replace literal "\t" strings
    .replace(/[\r\n\t]+/g, ' ') // Replace actual newlines, returns, tabs
    .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
    .trim();                    // Remove leading/trailing whitespace
};
