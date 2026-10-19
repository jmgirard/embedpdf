// embedpdf-viewer.js
// Hydrates every div.embedpdf placeholder emitted by the embedpdf shortcode.
// renderer=auto  -> native <object> when the browser can display PDFs inline
//                   (navigator.pdfViewerEnabled), otherwise a PDF.js canvas viewer;
//                   always PDF.js on iPhone and iPad
// renderer=native -> always <object type="application/pdf">
// renderer=pdfjs  -> always the PDF.js canvas viewer
//
// PDF.js core (pdf.min.mjs + pdf.worker.min.mjs, vendored from pdfjs-dist) is
// added by the shortcode as two scripts whose types are not JavaScript types,
// so the browser neither fetches nor runs them. PDF.js is loaded from them on
// demand, so a document that is not self-contained, and whose embeds all use
// the native path, never downloads it.
// A self-contained page (embed-resources: true) has the files inlined as the
// scripts' text, and its PDFs inlined as data: URLs.

// the URL of a PDF.js file: the script's src, or a blob: URL of its inlined text
function pdfjsUrl(kind) {
  const script = document.querySelector(`script[type="text/x-embedpdf-${kind}"]`);
  if (!script) throw new Error(`the PDF.js ${kind} script is missing from the page`);
  if (script.src) return script.src;
  return URL.createObjectURL(new Blob([script.textContent], { type: "text/javascript" }));
}

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(pdfjsUrl("pdfjs")).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = pdfjsUrl("worker");
      return lib;
    });
  }
  return pdfjsPromise;
}

// An inlined (data:) PDF as a Blob and its blob: URL. The browser decodes the
// data: URL itself (fetch), so the viewer makes no copy of the PDF in
// JavaScript. The native <object> and the download links get the blob: URL, so
// a large PDF is not copied into more attribute values.
async function inlinedPdf(src) {
  const blob = await (await fetch(src)).blob();
  const pdf = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  return { blob: pdf, url: URL.createObjectURL(pdf) };
}

// Serialize page rendering across every viewer on the page. All viewers share
// a single PDF.js worker, and firing many render() calls at once can overwhelm
// it — on some browsers the render promises then never resolve. Running one
// render at a time keeps things reliable (and is easier on constrained
// devices) at no real cost, since only on-screen pages are ever queued.
let renderQueue = Promise.resolve();
function enqueueRender(task) {
  const run = renderQueue.then(task, task);
  renderQueue = run.catch(() => {});
  return run;
}

// iPhone, iPod, or iPad. iPadOS Safari sends a Mac user agent by default, so
// an iPad is detected as a "Macintosh" that reports more than one touch point.
function isAppleMobile() {
  const ua = navigator.userAgent;
  if (/iPhone|iPod|iPad/.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

function nativeSupported() {
  // Safari on iPhone and iPad reports pdfViewerEnabled = true (seen on an iOS
  // 27.0 iPhone and iPad and an iOS 27.1 iPhone), but older iOS versions show
  // only the first page of an embedded PDF (issue #3). Always use PDF.js there.
  if (isAppleMobile()) return false;
  if (typeof navigator.pdfViewerEnabled === "boolean") {
    return navigator.pdfViewerEnabled;
  }
  // Ancient fallback heuristic: assume desktop supports inline PDFs, mobile does not
  return !/Mobi|Android/i.test(navigator.userAgent);
}

function hydrateNative(el, opts) {
  const object = document.createElement("object");
  object.type = "application/pdf";
  object.data = opts.page > 1 ? `${opts.href}#page=${opts.page}` : opts.href;
  if (opts.width) object.setAttribute("width", opts.width);
  if (opts.height) object.setAttribute("height", opts.height);
  // keep the no-JS fallback content (image or download link) inside the object
  while (el.firstChild) object.appendChild(el.firstChild);
  el.appendChild(object);
  el.classList.add("embedpdf-native");
}

// PDF.js could not load the PDF, for example a PDF on another site that sends
// no Access-Control-Allow-Origin header, or a missing file. Say so, and link to
// the PDF so the browser can open it in a new tab.
function showFailure(el, opts) {
  const msg = document.createElement("p");
  msg.className = "embedpdf-failed-text";
  msg.textContent = "This PDF cannot be shown here. ";
  const link = document.createElement("a");
  link.href = opts.href;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Open the PDF";
  msg.appendChild(link);
  el.replaceChildren(msg);
  el.classList.add("embedpdf-failed");
}

async function hydratePdfjs(el, opts) {
  let doc, page1;
  try {
    const pdfjs = await loadPdfjs();
    // an inlined PDF is read from its Blob only now, so a native embed never
    // holds its bytes as an array
    const source = opts.blob
      ? { data: new Uint8Array(await opts.blob.arrayBuffer()) }
      : { url: new URL(opts.src, document.baseURI).href };
    doc = await pdfjs.getDocument(source).promise;
    page1 = await doc.getPage(1);
  } catch (err) {
    showFailure(el, opts);
    throw err; // the caller logs it
  }

  el.textContent = "";
  el.classList.add("embedpdf-pdfjs");
  if (opts.width) el.style.width = /^\d+$/.test(opts.width) ? opts.width + "px" : opts.width;

  const pagesEl = document.createElement("div");
  pagesEl.className = "embedpdf-pages";
  if (opts.height) {
    pagesEl.style.height = /^\d+$/.test(opts.height) ? opts.height + "px" : opts.height;
  }

  let zoom = 1;
  const state = { doc, pagesEl, zoom, pageEls: [], ratios: [] };

  // page 1 sets the placeholder aspect ratio; refined per page on render
  const vp1 = page1.getViewport({ scale: 1 });
  const defaultRatio = vp1.height / vp1.width;

  for (let i = 1; i <= doc.numPages; i++) {
    const pageEl = document.createElement("div");
    pageEl.className = "embedpdf-page";
    pageEl.dataset.pageNumber = i;
    pageEl.style.aspectRatio = `1 / ${defaultRatio}`;
    pagesEl.appendChild(pageEl);
    state.pageEls.push(pageEl);
    state.ratios.push(defaultRatio);
  }

  // Upper bound on rendered canvas area. Rendering a page at full device-pixel
  // resolution can produce very large canvases that exhaust memory (and stall
  // rendering) on constrained devices; the official PDF.js viewer caps this
  // the same way.
  const MAX_CANVAS_PIXELS = 8_000_000;

  const renderPage = (pageEl) => {
    const num = Number(pageEl.dataset.pageNumber);
    const width = pageEl.clientWidth;
    if (width === 0) return; // not laid out yet (or hidden slide/tab); retried later
    const key = state.zoom + ":" + width;
    if (pageEl.dataset.renderKey === key) return; // already rendered at this size/zoom
    pageEl.dataset.renderKey = key;
    enqueueRender(async () => {
      // width may have changed while queued; skip if this render is now stale
      if (pageEl.dataset.renderKey !== key) return;
      try {
        const page = await state.doc.getPage(num);
        const base = page.getViewport({ scale: 1 });
        const ratio = base.height / base.width;
        state.ratios[num - 1] = ratio;
        pageEl.style.aspectRatio = `1 / ${ratio}`;
        const cssWidth = pageEl.clientWidth;
        let scale = (cssWidth / base.width) * Math.min(window.devicePixelRatio || 1, 2);
        const pixels = base.width * base.height * scale * scale;
        if (pixels > MAX_CANVAS_PIXELS) scale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas: canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
        pageEl.replaceChildren(canvas);
      } catch (err) {
        pageEl.dataset.renderKey = ""; // allow a later retry
        console.error("embedpdf: failed to render page " + num + " of " + opts.label, err);
      }
    });
  };

  // render any page whose box is within (or near) the scroll viewport; used for
  // the initial paint and after resize/zoom, since the IntersectionObserver's
  // first callback can fire before layout has given the pages a width
  const renderVisible = () => {
    const host = pagesEl.getBoundingClientRect();
    if (host.width === 0) return;
    const margin = host.height * 2;
    for (const p of state.pageEls) {
      const rect = p.getBoundingClientRect();
      if (rect.bottom > host.top - margin && rect.top < host.bottom + margin) {
        renderPage(p);
      }
    }
  };

  // the observer handles lazy loading of pages scrolled into view
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) renderPage(entry.target);
      }
    },
    { root: pagesEl, rootMargin: "200% 0px" }
  );
  state.pageEls.forEach((p) => observer.observe(p));

  const applyZoom = (factor) => {
    state.zoom = Math.min(4, Math.max(0.25, state.zoom * factor));
    const pct = state.zoom * 100;
    state.pageEls.forEach((p) => (p.style.width = pct + "%"));
    renderVisible();
  };

  if (opts.toolbar) {
    const toolbar = document.createElement("div");
    toolbar.className = "embedpdf-toolbar";

    const indicator = document.createElement("span");
    indicator.className = "embedpdf-pageinfo";
    indicator.textContent = `1 / ${doc.numPages}`;

    const zoomOut = document.createElement("button");
    zoomOut.type = "button";
    zoomOut.textContent = "−";
    zoomOut.title = "Zoom out";
    zoomOut.addEventListener("click", () => applyZoom(1 / 1.25));

    const zoomIn = document.createElement("button");
    zoomIn.type = "button";
    zoomIn.textContent = "+";
    zoomIn.title = "Zoom in";
    zoomIn.addEventListener("click", () => applyZoom(1.25));

    const download = document.createElement("a");
    download.className = "embedpdf-download";
    download.href = opts.href;
    download.setAttribute("download", opts.filename);
    download.textContent = "⤓";
    download.title = "Download PDF";

    toolbar.append(zoomOut, zoomIn, indicator, download);
    el.appendChild(toolbar);

    pagesEl.addEventListener(
      "scroll",
      () => {
        const host = pagesEl.getBoundingClientRect();
        for (let i = 0; i < state.pageEls.length; i++) {
          const rect = state.pageEls[i].getBoundingClientRect();
          if (rect.bottom > host.top + host.height / 2) {
            indicator.textContent = `${i + 1} / ${doc.numPages}`;
            break;
          }
        }
      },
      { passive: true }
    );
  }

  el.appendChild(pagesEl);

  // initial paint: layout may not give the pages a width immediately, and a
  // short single-page document never scrolls (so the IntersectionObserver may
  // never fire on its own). Poll on a wall-clock timer until at least one page
  // has started rendering. A timer is used rather than requestAnimationFrame
  // because rAF can fire before the browser has finished laying out the pages,
  // and the exact timing is unreliable across load conditions.
  let tries = 0;
  const kickInitial = () => {
    renderVisible();
    const started = state.pageEls.some((p) => p.dataset.renderKey);
    if (!started && tries++ < 40) setTimeout(kickInitial, 100);
  };
  kickInitial();

  let resizeTimer = null;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderVisible, 150);
  }).observe(pagesEl);

  if (opts.page > 1 && state.pageEls[opts.page - 1]) {
    state.pageEls[opts.page - 1].scrollIntoView({ block: "start" });
  }
}

// the last path segment of a link target, percent-decoded where possible
function fileName(href) {
  const name = href.split(/[?#]/)[0].split("/").pop();
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

async function hydrate(el) {
  const opts = {
    src: el.dataset.src,
    renderer: el.dataset.renderer || "auto",
    page: parseInt(el.dataset.page || "1", 10) || 1,
    toolbar: el.dataset.toolbar !== "false",
    width: el.dataset.width || "",
    height: el.dataset.height || "",
  };
  if (!opts.src) return;
  opts.href = opts.src;
  opts.filename = "";
  opts.label = opts.src;
  if (/^data:/i.test(opts.src)) {
    // A self-contained page has the PDF inlined in data-src, but its download
    // links (the fallback link and the button) still name the separate file.
    // Point them at the inlined PDF, under that file's name.
    const fallback = el.querySelector("a[download]");
    const fileHref = fallback ? fallback.getAttribute("href") : "";
    opts.filename = fileName(fileHref) || "document.pdf";
    opts.label = "the inlined " + opts.filename;
    // embed-resources marks an element with an inlined data-src as an image;
    // the hydrated embed holds controls and links, so it is not one
    if (el.getAttribute("role") === "img") el.removeAttribute("role");
    const pdf = await inlinedPdf(opts.src);
    opts.blob = pdf.blob;
    opts.href = pdf.url;
    // the Blob holds the PDF now; drop the data: URL text from the page
    el.removeAttribute("data-src");
    const links = fallback ? [fallback] : [];
    const next = el.nextElementSibling;
    const button = next && next.querySelector("a.embedpdf-btn");
    if (button && button.getAttribute("href") === fileHref) links.push(button);
    for (const a of links) {
      a.href = opts.href;
      a.setAttribute("download", opts.filename);
    }
  }
  const useNative = opts.renderer === "native" || (opts.renderer === "auto" && nativeSupported());
  if (useNative) {
    hydrateNative(el, opts);
  } else {
    await hydratePdfjs(el, opts);
  }
}

// a PDF.js embed that cannot load its PDF shows the failure message
// (showFailure); any other failure leaves the no-JS fallback content in place;
// one failure never stops the others
document.querySelectorAll("div.embedpdf").forEach((el) => {
  const label = /^data:/i.test(el.dataset.src || "") ? "an inlined PDF" : el.dataset.src;
  hydrate(el).catch((err) => console.error("embedpdf: failed to render " + label, err));
});
