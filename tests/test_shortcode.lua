-- Unit tests for the embedpdf shortcode (_extensions/embedpdf/embedpdf.lua).
--
-- The shortcode runs inside Pandoc/Quarto and depends on the `pandoc` and
-- `quarto` globals those inject. We stub just enough of them to load the file
-- and call pdf() directly, then assert on the markup it returns.
--
-- Run from the repo root (needs no extra installs — `pandoc` is a Lua 5.4
-- interpreter):
--
--     pandoc lua tests/test_shortcode.lua
--
-- Exit code is non-zero if any check fails.

local passed, failed = 0, 0
local function check(name, cond)
  if cond then
    passed = passed + 1
  else
    failed = failed + 1
    io.stderr:write("  FAIL: " .. name .. "\n")
  end
end
-- substring match (plain, so `-`, `%`, `[` in the needle are literal)
local function has(haystack, needle)
  return type(haystack) == "string" and haystack:find(needle, 1, true) ~= nil
end

-- ---------------------------------------------------------------------------
-- Stubs for the pandoc / quarto globals the shortcode uses
-- ---------------------------------------------------------------------------
local warnings, latex_pkgs, CURRENT_FORMAT

local function reset(format)
  warnings, latex_pkgs, CURRENT_FORMAT = {}, {}, format or "html:js"
end

pandoc = {
  utils = {
    stringify = function(x)
      if type(x) == "table" then return x.text or "" end
      return tostring(x)
    end,
  },
  RawBlock = function(fmt, text) return { t = "RawBlock", format = fmt, text = text } end,
  RawInline = function(fmt, text) return { t = "RawInline", format = fmt, text = text } end,
  Link = function(label, target) return { t = "Link", label = label, target = target } end,
  Para = function(content) return { t = "Para", content = content } end,
  Null = function() return { t = "Null" } end,
}

quarto = {
  doc = {
    is_format = function(f) return f == CURRENT_FORMAT end,
    use_latex_package = function(p) latex_pkgs[p] = true end,
    add_html_dependency = function(_) end,
  },
  log = { warning = function(m) warnings[#warnings + 1] = m end },
}

-- Load the shortcode; this defines the globals pdf() and embedpdf().
reset("html:js")
dofile("_extensions/embedpdf/embedpdf.lua")

-- ---------------------------------------------------------------------------
-- HTML output
-- ---------------------------------------------------------------------------
reset("html:js")
local r = pdf({ "a.pdf" }, {}, {}, {}, "block")
check("html: returns a RawBlock in block context", r.t == "RawBlock" and r.format == "html")
check("html: emits the placeholder div", has(r.text, '<div class="embedpdf"'))
check("html: sets data-src", has(r.text, 'data-src="a.pdf"'))
check("html: defaults renderer to auto", has(r.text, 'data-renderer="auto"'))
check("html: includes a no-JS download fallback", has(r.text, "Download PDF file."))

reset("html:js")
local ri = pdf({ "a.pdf" }, {}, {}, {}, "inline")
check("html: returns a RawInline in inline context", ri.t == "RawInline")

-- attributes
reset("html:js")
local ra = pdf({ "a.pdf" },
  { width = "600", height = "400", page = "2", toolbar = "false", class = "myclass" },
  {}, {}, "block")
check("html: data-width", has(ra.text, 'data-width="600"'))
check("html: data-height", has(ra.text, 'data-height="400"'))
check("html: data-page", has(ra.text, 'data-page="2"'))
check("html: data-toolbar false", has(ra.text, 'data-toolbar="false"'))
check("html: extra class on the div", has(ra.text, 'class="embedpdf myclass"'))

-- renderer forcing + validation
reset("html:js")
check("html: renderer=pdfjs", has(pdf({ "a.pdf" }, { renderer = "pdfjs" }, {}, {}, "block").text, 'data-renderer="pdfjs"'))
reset("html:js")
local rbad = pdf({ "a.pdf" }, { renderer = "bogus" }, {}, {}, "block")
check("html: unknown renderer falls back to auto", has(rbad.text, 'data-renderer="auto"'))
check("html: unknown renderer warns", #warnings == 1)

-- escaping
reset("html:js")
local resc = pdf({ "a&b.pdf" }, { button = "<b>go</b>" }, {}, {}, "block")
check("html: escapes & in src", has(resc.text, "a&amp;b.pdf"))
check("html: escapes button label", has(resc.text, "&lt;b&gt;go&lt;/b&gt;"))
check("html: no raw unescaped button tag", not has(resc.text, "<b>go</b>"))

-- download button
reset("html:js")
check("html: button renders", has(pdf({ "a.pdf" }, { button = "Download" }, {}, {}, "block").text, 'class="embedpdf-btn"'))

-- metadata defaults (and kwargs override)
reset("html:js")
local rmeta = pdf({ "a.pdf" }, {}, { embedpdf = { renderer = "pdfjs", height = "700" } }, {}, "block")
check("meta: renderer default applied", has(rmeta.text, 'data-renderer="pdfjs"'))
check("meta: height default applied", has(rmeta.text, 'data-height="700"'))
reset("html:js")
local rovr = pdf({ "a.pdf" }, { renderer = "native" }, { embedpdf = { renderer = "pdfjs" } }, {}, "block")
check("meta: kwargs override meta", has(rovr.text, 'data-renderer="native"'))

-- ---------------------------------------------------------------------------
-- LaTeX output
-- ---------------------------------------------------------------------------
reset("latex")
local rl = pdf({ "a.pdf" }, {}, {}, {}, "block")
check("latex: returns a RawBlock", rl.t == "RawBlock" and rl.format == "latex")
check("latex: includepdf all pages", has(rl.text, "\\includepdf[pages=-]{a.pdf}"))
check("latex: loads pdfpages package", latex_pkgs["pdfpages"] == true)

-- ---------------------------------------------------------------------------
-- Other formats (docx/epub/typst/...): a plain link, never dropped content
-- ---------------------------------------------------------------------------
reset("docx")
local ro = pdf({ "a.pdf" }, {}, {}, {}, "block")
check("other: block context yields a Para(Link)", ro.t == "Para" and ro.content[1].t == "Link")
check("other: link points at the pdf", ro.content[1].target == "a.pdf")
reset("docx")
check("other: inline context yields a Link", pdf({ "a.pdf" }, {}, {}, {}, "inline").t == "Link")

-- ---------------------------------------------------------------------------
-- Missing source
-- ---------------------------------------------------------------------------
reset("html:js")
local rn = pdf({}, {}, {}, {}, "block")
check("missing src: returns Null", rn.t == "Null")
check("missing src: warns", #warnings == 1)

-- alias
reset("html:js")
check("embedpdf alias behaves like pdf", has(pdf({ "a.pdf" }, {}, {}, {}, "block").text, "embedpdf")
  and embedpdf({ "a.pdf" }, {}, {}, {}, "block").t == "RawBlock")

-- ---------------------------------------------------------------------------
-- HTML dependencies: PDF.js is added only for an embed that can use it
-- ---------------------------------------------------------------------------
-- Each document is a fresh load of the shortcode, so the once-per-document
-- flags start unset. Returns the dependencies added, by name, and how many
-- times each name was added.
local function render_document(calls)
  local deps, counts = {}, {}
  quarto.doc.add_html_dependency = function(d)
    deps[d.name] = d
    counts[d.name] = (counts[d.name] or 0) + 1
  end
  dofile("_extensions/embedpdf/embedpdf.lua")
  for _, c in ipairs(calls) do pdf(c.args, c.kwargs or {}, c.meta or {}, {}, "block") end
  quarto.doc.add_html_dependency = function(_) end
  return deps, counts
end
local JS_TYPES = { [""] = true, module = true, ["text/javascript"] = true, ["application/javascript"] = true }
local function pdfjs_scripts(dep)
  local paths, non_js = {}, true
  for _, s in ipairs(dep and dep.scripts or {}) do
    paths[s.path] = true
    if JS_TYPES[(s.attribs and s.attribs.type) or ""] then non_js = false end
  end
  return paths, non_js
end

reset("html:js")
local d_native = render_document({
  { args = { "a.pdf" }, kwargs = { renderer = "native" } },
  { args = { "b.pdf" }, kwargs = { renderer = "native" } },
})
check("deps: all-native document adds the viewer", d_native["embedpdf"] ~= nil)
check("deps: all-native document adds no PDF.js", d_native["embedpdf-pdfjs"] == nil)
local viewer_paths = pdfjs_scripts(d_native["embedpdf"])
check("deps: the viewer dependency lists no PDF.js file",
  not viewer_paths["pdfjs/pdf.min.mjs"] and not viewer_paths["pdfjs/pdf.worker.min.mjs"]
  and d_native["embedpdf"].resources == nil)

reset("html:js")
local d_meta = render_document({ { args = { "a.pdf" }, meta = { embedpdf = { renderer = "native" } } } })
check("deps: native from metadata adds no PDF.js", d_meta["embedpdf-pdfjs"] == nil)

for _, case in ipairs({
  { name = "auto (default)", kwargs = {} },
  { name = "pdfjs", kwargs = { renderer = "pdfjs" } },
}) do
  reset("html:js")
  local d = render_document({
    { args = { "a.pdf" }, kwargs = { renderer = "native" } },
    { args = { "b.pdf" }, kwargs = case.kwargs },
  })
  local paths, non_js = pdfjs_scripts(d["embedpdf-pdfjs"])
  check("deps: " .. case.name .. " embed adds both PDF.js files",
    paths["pdfjs/pdf.min.mjs"] and paths["pdfjs/pdf.worker.min.mjs"])
  check("deps: " .. case.name .. " PDF.js scripts have a non-JavaScript type", d["embedpdf-pdfjs"] ~= nil and non_js)
end

reset("html:js")
local _, c_many = render_document({
  { args = { "a.pdf" } },
  { args = { "b.pdf" }, kwargs = { renderer = "pdfjs" } },
  { args = { "c.pdf" } },
})
check("deps: each dependency is added once per document",
  c_many["embedpdf"] == 1 and c_many["embedpdf-pdfjs"] == 1)

reset("latex")
check("deps: LaTeX output adds no dependency", next((render_document({ { args = { "a.pdf" } } }))) == nil)

-- ---------------------------------------------------------------------------
io.write(string.format("\n%d passed, %d failed\n", passed, failed))
os.exit(failed == 0 and 0 or 1)
