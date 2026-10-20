-- embedpdf: embed PDF files in Quarto HTML documents (with mobile support via PDF.js)

-- simple HTML escaper for attribute values and text nodes
local function html_escape(s)
  s = tostring(s or "")
  s = s:gsub("&", "&amp;")
       :gsub("<", "&lt;")
       :gsub(">", "&gt;")
       :gsub('"', "&quot;")
       :gsub("'", "&#39;")
  return s
end

-- stringify a kwarg/meta value; returns '' when absent
local function str(v)
  if v == nil then return '' end
  if type(v) == "boolean" then return tostring(v) end
  if type(v) == "string" then return v end
  return pandoc.utils.stringify(v)
end

-- the path as a URL: a % that does not start a %XX escape is written as %25,
-- so a file name such as 100%.pdf reaches the server as a valid address
local function url_path(s)
  return (s:gsub("()%%", function(i)
    if s:sub(i + 1, i + 2):match("^%x%x$") then return "%" end
    return "%25"
  end))
end

-- the path as a LaTeX file name: decode the %XX escapes of printable ASCII
-- other than the characters below, and keep every other % as written
-- (a " or , in an \includepdf file name fails in lualatex and pdflatex, M015 probe)
local LATEX_UNSAFE = { ["\\"] = true, ["{"] = true, ["}"] = true, ["#"] = true,
  ["$"] = true, ["&"] = true, ["~"] = true, ["^"] = true, ["_"] = true,
  ['"'] = true, [","] = true }
local function latex_path(s)
  return (s:gsub("%%(%x%x)", function(hex)
    local byte = tonumber(hex, 16)
    local c = string.char(byte)
    if byte >= 0x20 and byte <= 0x7E and not LATEX_UNSAFE[c] then return c end
    return nil
  end))
end

local VERSION = "1.2.9"
local dependency_injected = false
local pdfjs_injected = false

local function inject_dependency()
  if dependency_injected then return end
  dependency_injected = true
  quarto.doc.add_html_dependency({
    name = "embedpdf",
    version = VERSION,
    scripts = {
      { path = "embedpdf-viewer.js", attribs = { type = "module" }, afterBody = true }
    },
    stylesheets = { "embedpdf.css" }
  })
end

-- PDF.js core, vendored from pdfjs-dist 6.1.200 (see pdfjs/ directory), added
-- only for a document with an embed that can use it. The script types are not
-- JavaScript types, so the browser neither fetches nor runs them; the viewer
-- loads PDF.js from their src. With embed-resources: true, Quarto inlines the
-- files as the scripts' text instead, and the viewer loads PDF.js from that.
local function inject_pdfjs()
  if pdfjs_injected then return end
  pdfjs_injected = true
  quarto.doc.add_html_dependency({
    name = "embedpdf-pdfjs",
    version = VERSION,
    scripts = {
      { path = "pdfjs/pdf.min.mjs", attribs = { type = "text/x-embedpdf-pdfjs" }, afterBody = true },
      { path = "pdfjs/pdf.worker.min.mjs", attribs = { type = "text/x-embedpdf-worker" }, afterBody = true }
    }
  })
end

function pdf(args, kwargs, meta, raw_args, context)
  local src = str(args[1])
  if src == '' then src = str(kwargs['file']) end
  if src == '' then
    quarto.log.warning("embedpdf: no PDF file given to the pdf shortcode")
    return pandoc.Null()
  end

  -- document/project-level defaults from the `embedpdf` metadata key,
  -- overridden by per-shortcode kwargs
  local defaults = {}
  if meta ~= nil and meta['embedpdf'] ~= nil and type(meta['embedpdf']) == "table" then
    for k, v in pairs(meta['embedpdf']) do
      defaults[k] = str(v)
    end
  end

  local function opt(name, fallback)
    local v = str(kwargs[name])
    if v ~= '' then return v end
    v = str(defaults[name])
    if v ~= '' then return v end
    return fallback or ''
  end

  local width    = opt('width')
  local height   = opt('height')
  local border   = opt('border')
  local class    = opt('class')
  local button   = opt('button')
  local renderer = opt('renderer', 'auto')
  local toolbar  = opt('toolbar', 'true')
  local page     = opt('page')

  if renderer ~= 'auto' and renderer ~= 'native' and renderer ~= 'pdfjs' then
    quarto.log.warning("embedpdf: unknown renderer '" .. renderer .. "', using 'auto'")
    renderer = 'auto'
  end

  -- non-HTML formats -------------------------------------------------------

  if quarto.doc.is_format("latex") then
    quarto.doc.use_latex_package("pdfpages")
    local file = latex_path(src)
    local line = '\\includepdf[pages=-]{' .. file .. '}'
    if file:find('%', 1, true) then
      -- % starts a LaTeX comment; in this group it is a plain character
      line = '\\begingroup\\catcode`\\%=12\\relax' .. line .. '\\endgroup'
    end
    return pandoc.RawBlock('latex', line)
  end

  if not quarto.doc.is_format("html:js") then
    -- epub, docx, gfm, typst, ...: emit a plain link instead of dropping content
    local link = pandoc.Link(button ~= '' and button or "Download PDF file", url_path(src))
    if context == "block" then
      return pandoc.Para({ link })
    end
    return link
  end

  -- HTML -------------------------------------------------------------------

  inject_dependency()
  if renderer ~= 'native' then inject_pdfjs() end

  local esc_src = html_escape(url_path(src))

  local button_html = ''
  if button ~= '' then
    button_html = '<p><a class="embedpdf-btn" href="' .. esc_src .. '" download>' ..
                  html_escape(button) .. '</a></p>'
  end

  -- shown when JavaScript is disabled (the viewer never hydrates)
  local fallback = '<a href="' .. esc_src .. '" download>Download PDF file.</a>'

  local div = '<div class="embedpdf'
  if class ~= '' then div = div .. ' ' .. html_escape(class) end
  div = div .. '" data-src="' .. esc_src .. '"'
  div = div .. ' data-renderer="' .. html_escape(renderer) .. '"'
  if width   ~= ''      then div = div .. ' data-width="'  .. html_escape(width)  .. '"' end
  if height  ~= ''      then div = div .. ' data-height="' .. html_escape(height) .. '"' end
  if page    ~= ''      then div = div .. ' data-page="'   .. html_escape(page)   .. '"' end
  if toolbar == 'false' then div = div .. ' data-toolbar="false"' end
  if border  ~= ''      then
    div = div .. ' style="border: ' .. html_escape(border) .. 'px solid #888;"'
  end
  local html = div .. '>' .. fallback .. '</div>' .. button_html

  if context == "block" then
    return pandoc.RawBlock('html', html)
  end
  return pandoc.RawInline('html', html)
end

-- alias shortcode
function embedpdf(...)
  return pdf(...)
end
