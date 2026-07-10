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

  const renderPage = async (pageEl) => {
    const num = Number(pageEl.dataset.pageNumber);
    if (pageEl.clientWidth === 0) return; // hidden (e.g., inactive slide/tab); retried on resize
    if (pageEl.dataset.renderedZoom === String(state.zoom) &&
        pageEl.dataset.renderedWidth === String(pagesEl.clientWidth)) {
      return;
    }
    pageEl.dataset.renderedZoom = String(state.zoom);
    pageEl.dataset.renderedWidth = String(pagesEl.clientWidth);
    const page = await state.doc.getPage(num);
    const base = page.getViewport({ scale: 1 });
    const ratio = base.height / base.width;
    state.ratios[num - 1] = ratio;
    pageEl.style.aspectRatio = `1 / ${ratio}`;
    const cssWidth = pageEl.clientWidth;
    const scale = (cssWidth / base.width) * (window.devicePixelRatio || 1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas: canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
    pageEl.replaceChildren(canvas);
  };

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
    // force fresh intersection records so visible pages re-render at the new size
    state.pageEls.forEach((p) => {
      observer.unobserve(p);
      observer.observe(p);
    });
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

  let resizeTimer = null;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => applyZoom(1), 150);
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
