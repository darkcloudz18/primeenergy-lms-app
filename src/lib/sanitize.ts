// Very small sanitizer: strips <script> and inline event handlers (on*)
export function basicSanitize(html: string): string {
  if (!html) return "";
  return (
    html
      // remove script/style tags completely
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      // remove inline event handlers like onclick="..."
      .replace(/\son\w+=(["']).*?\1/gi, "")
      // optional: strip javascript: in href/src
      .replace(/\s(href|src)=["']\s*javascript:[^"']*["']/gi, "")
  );
}
