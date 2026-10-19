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

// Serialize PDF.js work across every viewer on the page. All viewers share
// a single PDF.js worker, and firing many render() calls at once can overwhelm
// it — on some browsers the render promises then never resolve. Running one
// task at a time keeps things reliable (and is easier on constrained
// devices) at no real cost, since only pages on or near the screen are ever
// rendered. Reading a page's text (for screen readers) starts only when no
// page render waits, so it delays a render by at most one page's text read.
const renderTasks = [];
const textTasks = [];
let queueBusy = false;
function runQueue() {
  if (queueBusy) return;
  const task = renderTasks.shift() || textTasks.shift();
  if (!task) return;
  queueBusy = true;
  Promise.resolve()
    .then(task)
    .catch(() => {})
    .then(() => {
      queueBusy = false;
      runQueue();
    });
}
function enqueueRender(task) {
  renderTasks.push(task);
  runQueue();
}
function enqueueText(task) {
  textTasks.push(task);
  runQueue();
}

// a page's text as PDF.js extracts it, with a line break at each line end
async function pageText(page) {
  const content = await page.getTextContent();
  let text = "";
  for (const item of content.items) {
    text += item.str;
    if (item.hasEOL) text += "\n";
  }
  return text.trim();
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
  // a screen reader names the embed by its file, as it names a PDF.js embed;
  // aria-label alone, since a title equal to it is read again as a description
  if (opts.name) object.setAttribute("aria-label", opts.name);
  // keep the no-JS fallback content (image or download link) inside the object
  while (el.firstChild) object.appendChild(el.firstChild);
  el.appendChild(object);
  el.classList.add("embedpdf-native");
}

// PDF.js could not load the PDF (for example a PDF on another site that sends
// no Access-Control-Allow-Origin header, or a missing file), or an inlined PDF
// did not decode (with any renderer). Say so. A PDF that is not inlined gets a link that opens it
// in a new tab. An inlined PDF (opts.blob) gets a link that downloads it under
// its file name, because its blob: URL names no file. An inlined PDF that did
// not decode (no opts.href) gets no link, because there is no file to give.
function showFailure(el, opts) {
  const msg = document.createElement("p");
  msg.className = "embedpdf-failed-text";
  msg.textContent = "This PDF cannot be shown here.";
  if (opts.href) {
    const link = document.createElement("a");
    link.href = opts.href;
    if (opts.blob) {
      link.download = opts.filename;
      link.textContent = "Download the PDF";
    } else {
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Open the PDF";
    }
    msg.append(" ", link);
  }
  el.replaceChildren(msg);
  el.classList.add("embedpdf-failed");
  if (opts.width) el.style.width = /^\d+$/.test(opts.width) ? opts.width + "px" : opts.width;
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
    // a document that loaded but whose page 1 failed still holds worker memory
    if (doc) doc.destroy();
    showFailure(el, opts);
    throw err; // the caller logs it
  }

  el.textContent = "";
  el.classList.add("embedpdf-pdfjs");
  // a screen reader names the embed by its file, before its "Page i of n" groups
  el.setAttribute("role", "group");
  el.setAttribute("aria-label", opts.name || "PDF");
  if (opts.width) el.style.width = /^\d+$/.test(opts.width) ? opts.width + "px" : opts.width;

  const pagesEl = document.createElement("div");
  pagesEl.className = "embedpdf-pages";
  if (opts.height) {
    pagesEl.style.height = /^\d+$/.test(opts.height) ? opts.height + "px" : opts.height;
  }

  let zoom = 1;
  const state = { doc, pagesEl, zoom, pageEls: [], textEls: [], ratios: [] };

  // page 1 sets the placeholder aspect ratio; refined per page on render
  const vp1 = page1.getViewport({ scale: 1 });
  const defaultRatio = vp1.height / vp1.width;

  // Each page is a labeled group that holds the page's text, hidden from view
  // (embedpdf.css), for screen readers. The canvas is hidden from them.
  for (let i = 1; i <= doc.numPages; i++) {
    const pageEl = document.createElement("div");
    pageEl.className = "embedpdf-page";
    pageEl.dataset.pageNumber = i;
    pageEl.setAttribute("role", "group");
    pageEl.setAttribute("aria-label", `Page ${i} of ${doc.numPages}`);
    pageEl.style.aspectRatio = `1 / ${defaultRatio}`;
    const textEl = document.createElement("div");
    textEl.className = "embedpdf-text";
    pageEl.appendChild(textEl);
    pagesEl.appendChild(pageEl);
    state.pageEls.push(pageEl);
    state.textEls.push(textEl);
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
        canvas.setAttribute("aria-hidden", "true");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas: canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
        // replace only the old canvas; the page's text stays
        const old = pageEl.querySelector("canvas");
        if (old) old.replaceWith(canvas);
        else pageEl.prepend(canvas);
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

    // shown as "1 / 2", read by screen readers as "Page 1 of 2"
    const indicator = document.createElement("span");
    indicator.className = "embedpdf-pageinfo";
    const spoken = document.createElement("span");
    spoken.className = "embedpdf-pageinfo-text";
    const shown = document.createElement("span");
    shown.setAttribute("aria-hidden", "true");
    indicator.append(spoken, shown);
    const showPage = (i) => {
      spoken.textContent = `Page ${i} of ${doc.numPages}`;
      shown.textContent = `${i} / ${doc.numPages}`;
    };
    showPage(1);

    // A control's title is its tooltip and its only name: the glyph is hidden
    // from screen readers, and no aria-label repeats the title (Chrome would
    // expose a repeated title as a description, read after the name).
    const label = (control, glyph, title) => {
      const span = document.createElement("span");
      span.setAttribute("aria-hidden", "true");
      span.textContent = glyph;
      control.appendChild(span);
      control.title = title;
    };

    const zoomOut = document.createElement("button");
    zoomOut.type = "button";
    label(zoomOut, "−", "Zoom out");
    zoomOut.addEventListener("click", () => applyZoom(1 / 1.25));

    const zoomIn = document.createElement("button");
    zoomIn.type = "button";
    label(zoomIn, "+", "Zoom in");
    zoomIn.addEventListener("click", () => applyZoom(1.25));

    const download = document.createElement("a");
    download.className = "embedpdf-download";
    download.href = opts.href;
    download.setAttribute("download", opts.filename);
    label(download, "⤓", "Download PDF");

    toolbar.append(zoomOut, zoomIn, indicator, download);
    el.appendChild(toolbar);

    pagesEl.addEventListener(
      "scroll",
      () => {
        const host = pagesEl.getBoundingClientRect();
        for (let i = 0; i < state.pageEls.length; i++) {
          const rect = state.pageEls[i].getBoundingClientRect();
          if (rect.bottom > host.top + host.height / 2) {
            showPage(i + 1);
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

  // read every page's text, so a screen reader can reach pages that were
  // never scrolled into view; a page whose text fails keeps an empty block.
  // A read that has not finished after 10 s gives up its place in the queue,
  // so a stuck read cannot stop the page renders behind it.
  state.textEls.forEach((textEl, i) =>
    enqueueText(async () => {
      let timer;
      try {
        const read = state.doc.getPage(i + 1).then(pageText);
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("the text read took more than 10 s")), 10000);
        });
        textEl.textContent = await Promise.race([read, timeout]);
      } catch (err) {
        console.error("embedpdf: failed to read the text of page " + (i + 1) + " of " + opts.label, err);
      } finally {
        clearTimeout(timer);
      }
    })
  );

  let resizeTimer = null;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderVisible, 150);
  }).observe(pagesEl);

  if (opts.page > 1 && state.pageEls[opts.page - 1]) {
    state.pageEls[opts.page - 1].scrollIntoView({ block: "start" });
  }
}

function decoded(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// The file name in a PDF's address, or "" when the address names no file.
// Without its #fragment: the last path segment, percent-decoded, when it ends
// in .pdf; else the last segment of the first query value that ends in .pdf
// (a script that takes the PDF by a query value); else the last non-empty path
// segment when there is no query. A host alone, and a data: or blob: address,
// name no file. Exported for tests/name_rule_test.mjs.
export function fileName(address) {
  const href = String(address || "").trim();
  if (/^(data|blob):/i.test(href)) return "";
  const noFragment = href.split("#")[0];
  const q = noFragment.indexOf("?");
  const beforeQuery = q < 0 ? noFragment : noFragment.slice(0, q);
  // drop the scheme and host, or the host of a scheme-relative address (once:
  // a doubled slash after the host starts the path, not another host)
  const path = /^[a-z][a-z0-9+.-]*:\/\//i.test(beforeQuery)
    ? beforeQuery.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "")
    : beforeQuery.replace(/^\/\/[^/]*/, "");
  const segments = path.split("/").map(decoded);
  const last = segments[segments.length - 1];
  if (/\.pdf$/i.test(last)) return last;
  if (q >= 0) {
    for (const [, value] of new URLSearchParams(noFragment.slice(q + 1))) {
      const name = value.split("/").pop();
      if (/\.pdf$/i.test(name)) return name;
    }
    return "";
  }
  return segments.filter(Boolean).pop() || "";
}

// An embed's name for screen readers: "PDF: <file name>", or "PDF" when
// its address names no file. An inlined (data:) PDF is named by its fallback
// download link, which still names the separate file.
function embedName(el) {
  let address = el.dataset.src || "";
  // a URL attribute may hold spaces around the address; fileName() drops them too
  if (/^\s*data:/i.test(address)) {
    const fallback = el.querySelector("a[download]");
    address = fallback ? fallback.getAttribute("href") : "";
  }
  const name = fileName(address);
  return name ? "PDF: " + name : "PDF";
}

function usesPdfjs(el) {
  const renderer = el.dataset.renderer || "auto";
  return !(renderer === "native" || (renderer === "auto" && nativeSupported()));
}

// Each embed's name, by placeholder. Embeds that share a name are numbered
// "(k of n)" in document order (a RevealJS deck holds all its slides in the
// document), so a screen reader can tell them apart. The count takes every
// embed with a PDF address, native or PDF.js, whether or not its PDF loads.
function embedNames(placeholders) {
  const names = new Map();
  const total = new Map();
  for (const el of placeholders) {
    if (!el.dataset.src) continue;
    const name = embedName(el);
    names.set(el, name);
    total.set(name, (total.get(name) || 0) + 1);
  }
  const seen = new Map();
  for (const [el, name] of names) {
    const n = total.get(name);
    if (n < 2) continue;
    const k = (seen.get(name) || 0) + 1;
    seen.set(name, k);
    names.set(el, `${name} (${k} of ${n})`);
  }
  return names;
}

async function hydrate(el, name) {
  const opts = {
    name,
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
  if (/^\s*data:/i.test(opts.src)) {
    // A self-contained page has the PDF inlined in data-src, but its download
    // links (the fallback link and the button) still name the separate file.
    // Point them at the inlined PDF, under that file's name.
    const fallback = el.querySelector("a[download]");
    const fileHref = fallback ? fallback.getAttribute("href") : "";
    // a download needs a file name; the embed's name does not take this one
    opts.filename = fileName(fileHref) || "document.pdf";
    opts.label = "the inlined " + opts.filename;
    // embed-resources marks an element with an inlined data-src as an image;
    // the hydrated embed holds controls and links, so it is not one
    if (el.getAttribute("role") === "img") el.removeAttribute("role");
    let pdf;
    try {
      pdf = await inlinedPdf(opts.src);
    } catch (err) {
      // the data: address did not decode, so neither renderer has a PDF, and
      // the download links name a file the page does not ship
      opts.href = null;
      showFailure(el, opts);
      throw err; // the caller logs it
    }
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
  if (!usesPdfjs(el)) {
    hydrateNative(el, opts);
  } else {
    await hydratePdfjs(el, opts);
  }
}

// a PDF.js embed that cannot load its PDF, and an embed whose inlined PDF does
// not decode, shows the failure message (showFailure); any other failure
// leaves the no-JS fallback content in place;
// one failure never stops the others
const placeholders = [...document.querySelectorAll("div.embedpdf")];
const names = embedNames(placeholders);
placeholders.forEach((el) => {
  const label = /^\s*data:/i.test(el.dataset.src || "") ? "an inlined PDF" : el.dataset.src;
  hydrate(el, names.get(el)).catch((err) => console.error("embedpdf: failed to render " + label, err));
});
