// embedpdf-viewer.js
// Hydrates every div.embedpdf placeholder emitted by the embedpdf shortcode.
// renderer=auto  -> native <object> when the browser can display PDFs inline
//                   (navigator.pdfViewerEnabled), otherwise a PDF.js canvas viewer
// renderer=native -> always <object type="application/pdf">
// renderer=pdfjs  -> always the PDF.js canvas viewer
//
// PDF.js core (pdf.min.mjs + pdf.worker.min.mjs, vendored from pdfjs-dist) is
// resolved relative to this file via import.meta.url and loaded on demand, so
// documents that only ever use the native path never download it.

const PDFJS_URL = new URL("./pdf.min.mjs", import.meta.url).href;
const WORKER_URL = new URL("./pdf.worker.min.mjs", import.meta.url).href;

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(PDFJS_URL).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      return lib;
    });
  }
  return pdfjsPromise;
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

function nativeSupported() {
  if (typeof navigator.pdfViewerEnabled === "boolean") {
    return navigator.pdfViewerEnabled;
  }
  // Ancient fallback heuristic: assume desktop supports inline PDFs, mobile does not
  return !/Mobi|Android/i.test(navigator.userAgent);
}

function hydrateNative(el, opts) {
  const object = document.createElement("object");
  object.type = "application/pdf";
  object.data = opts.page > 1 ? `${opts.src}#page=${opts.page}` : opts.src;
  if (opts.width) object.setAttribute("width", opts.width);
  if (opts.height) object.setAttribute("height", opts.height);
  // keep the no-JS fallback content (image or download link) inside the object
  while (el.firstChild) object.appendChild(el.firstChild);
  el.appendChild(object);
  el.classList.add("embedpdf-native");
}

async function hydratePdfjs(el, opts) {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ url: new URL(opts.src, document.baseURI).href }).promise;

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
    download.href = opts.src;
    download.setAttribute("download", "");
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
