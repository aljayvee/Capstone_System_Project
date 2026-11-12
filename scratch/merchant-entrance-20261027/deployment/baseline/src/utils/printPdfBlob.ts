/**
 * Opens the browser's print screen on a PDF the page already has in memory.
 *
 * Sits beside downloadBlob.ts, and exists for the same reason: the report PDFs
 * come through the API client because the access token lives only in memory,
 * so the bytes arrive as a Blob. This hands them to the print screen instead of
 * the Downloads folder. Nothing is saved unless the person picks "Save as PDF".
 *
 * The PDF is loaded into an invisible same-origin frame and that frame's
 * print() is called, which shows the browser's own print preview of exactly
 * the document the server laid out (landscape, fixed margins).
 *
 * Needs `blob:` in the portal CSP's frame-src (nginx portal-security-headers).
 */

export type PrintOutcome = "print-screen" | "opened-viewer";

/** The frame behind the print screen that is open now, if any. */
let activeFrame: { frame: HTMLIFrameElement; url: string } | null = null;

function releaseActiveFrame() {
  if (!activeFrame) return;
  activeFrame.frame.remove();
  URL.revokeObjectURL(activeFrame.url);
  activeFrame = null;
}

export function printPdfBlob(blob: Blob): Promise<PrintOutcome> {
  // A frame keeps its document until the next print replaces it. Removing it on
  // a timer could pull the document out from under a print screen someone is
  // still reading, which closes that screen in Chrome.
  releaseActiveFrame();

  const pdf = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdf);

  // No built-in PDF viewer (Android Chrome, some locked-down browsers): a frame
  // would render nothing and print a blank page. The device's own viewer has a
  // print action, so the document goes there instead.
  if (navigator.pdfViewerEnabled === false) {
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return Promise.resolve("opened-viewer");
  }

  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.title = "Report for printing";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    // Off-screen and transparent rather than display:none. A frame that is not
    // laid out never renders its PDF, and the print screen then shows a blank page.
    Object.assign(frame.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
    });

    frame.onload = () => {
      // Chrome's PDF viewer finishes setting up just after `load`. Printing on
      // the same tick can open the print screen on an empty document.
      window.setTimeout(() => {
        try {
          const win = frame.contentWindow;
          if (!win) throw new Error("The print frame has no window.");
          win.focus();
          win.print();
          resolve("print-screen");
        } catch (err) {
          releaseActiveFrame();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }, 300);
    };

    activeFrame = { frame, url };
    frame.src = url;
    document.body.appendChild(frame);
  });
}
