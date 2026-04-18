
import { marked } from 'marked';

interface WikiData {
  title: string;
  slug: string;
  content?: string;
  format: string;
}

export const downloadWikiPdf = async (wiki: WikiData) => {
  // 1. Parse Markdown
  const rawHtml = await marked.parse(wiki.content || '_No content available_');

  // 2. Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden'; // Don't show it
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    throw new Error('Could not access iframe document');
  }

  // 3. Inject Content + GitLab/Print CSS
  // Using @media print to force settings
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${wiki.title}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
                font-size: 14px;
                line-height: 1.5;
                color: #333;
                margin: 0;
                padding: 40px; /* Screen padding */
                background: white;
            }

            /* Headers */
            h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; color: #111; }
            h1 { font-size: 2.25em; padding-bottom: 0.3em; border-bottom: 1px solid #dcdcde; margin-top: 0; }
            h2 { font-size: 1.75em; padding-bottom: 0.3em; border-bottom: 1px solid #dcdcde; }
            h3 { font-size: 1.5em; }

            /* Content */
            p { margin-top: 0; margin-bottom: 16px; }
            ul, ol { padding-left: 2em; margin-bottom: 16px; }
            li { margin-bottom: 4px; }
            a { color: #1068bf; text-decoration: none; }

            /* Code Blocks */
            pre {
                background-color: #f6f7f9;
                border: 1px solid #dcdcde;
                border-radius: 4px;
                padding: 16px;
                margin-bottom: 16px;
                font-family: 'JetBrains Mono', 'Consolas', monospace;
                font-size: 11px; 
                color: #333;
                white-space: pre-wrap; /* Wrap long lines for print */
                word-wrap: break-word;
            }
            code {
                font-family: 'JetBrains Mono', 'Consolas', monospace;
                padding: 2px 4px;
                font-size: 90%;
                color: #c0341d;
                background-color: #fbe5e1;
                border-radius: 4px;
            }

            /* Tables */
            table {
                border-collapse: collapse;
                width: 100%;
                margin-bottom: 16px;
            }
            th, td {
                border: 1px solid #dbdbdb;
                padding: 8px 12px;
                text-align: left;
            }
            th { background-color: #fafafa; font-weight: 600; }
            tr:nth-child(even) { background-color: #fcfcfc; }
            
            img { max-width: 100%; height: auto; margin: 16px 0; border: 1px solid #eee; border-radius: 4px; }
            blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; color: #666; margin-left: 0; }

            /* PRINT SPECIFIC STYLES */
            @media print {
                @page {
                    size: A4;
                    margin: 15mm; /* Professional native margin */
                }
                body {
                    padding: 0; /* Remove screen padding */
                    -webkit-print-color-adjust: exact; /* Force render background colors */
                    print-color-adjust: exact;
                }
                
                /* Avoid breaking elements inside split pages */
                pre, blockquote, tr, img {
                    page-break-inside: avoid;
                }
                h1, h2, h3 {
                    page-break-after: avoid;
                }
            }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
            <h1 style="border: none; margin: 0; font-size: 28px; color: #333;">${wiki.title}</h1>
            <p style="color: #666; font-size: 12px; margin-top: 5px;">${wiki.slug}</p>
        </div>
        ${rawHtml}
        <script>
            // Auto-print when loaded
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                    // Optional: notify parent window
                }, 500);
            };
        </script>
      </body>
    </html>
  `);
  doc.close();

  // Clean up handled by user interaction (window.print is blocking in some browsers)
  // or we remove it after a delay.
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 60000); // 1-minute timeout to allow interaction
};
