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

// The bytes and a blob: URL of an inlined (data:) PDF, decoded once per source.
// The native <object> and the download links get the blob: URL, so a large PDF
// is not copied into more attribute values.
const inlinedPdfs = new Map();
function inlinedPdf(src) {
  if (!inlinedPdfs.has(src)) {
    const comma = src.indexOf(",");
    const meta = src.slice(5, comma);
    const body = src.slice(comma + 1);
    let bytes;
    if (/;base64$/i.test(meta)) {
      const bin = atob(body);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(body));
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    inlinedPdfs.set(src, { bytes, url });
  }
  return inlinedPdfs.get(src);
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

async function hydratePdfjs(el, opts) {
  const pdfjs = await loadPdfjs();
  // PDF.js takes ownership of the bytes it is given, so it gets a copy
  const source = opts.inlined
    ? { data: inlinedPdf(opts.src).bytes.slice() }
    : { url: new URL(opts.src, document.baseURI).href };
  const doc = await pdfjs.getDocument(source).promise;

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
  const page1 = await doc.getPage(1);
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
        console.error("embedpdf: failed to render page " + num + " of " + opts.src, err);
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

function hydrate(el) {
  const opts = {
    src: el.dataset.src,
    renderer: el.dataset.renderer || "auto",
    page: parseInt(el.dataset.page || "1", 10) || 1,
    toolbar: el.dataset.toolbar !== "false",
    width: el.dataset.width || "",
    height: el.dataset.height || "",
  };
  if (!opts.src) return;
  // A self-contained page has the PDF inlined in data-src, but its download
  // links (the fallback link and the button) still name the separate file.
  // Point them at the inlined PDF, under that file's name.
  opts.inlined = /^data:/i.test(opts.src);
  opts.href = opts.src;
  opts.filename = "";
  if (opts.inlined) {
    const fallback = el.querySelector("a[download]");
    const fileHref = fallback ? fallback.getAttribute("href") : "";
    opts.href = inlinedPdf(opts.src).url;
    opts.filename = (fileHref.split(/[?#]/)[0].split("/").pop() || "document.pdf");
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
    hydratePdfjs(el, opts).catch((err) => {
      // leave the no-JS fallback content in place
      console.error("embedpdf: failed to render " + opts.src, err);
    });
  }
}

document.querySelectorAll("div.embedpdf").forEach(hydrate);
