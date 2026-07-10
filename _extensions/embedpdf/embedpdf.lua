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

local dependency_injected = false

local function inject_dependency()
  if dependency_injected then return end
  dependency_injected = true
  quarto.doc.add_html_dependency({
    name = "embedpdf",
    version = "1.0.0",
    scripts = {
      { path = "embedpdf-viewer.js", attribs = { type = "module" }, afterBody = true }
    },
    stylesheets = { "embedpdf.css" },
    resources = {
      -- PDF.js core, vendored from pdfjs-dist 6.1.200 (see pdfjs/ directory);
      -- flattened next to embedpdf-viewer.js so import.meta.url resolution works
      { name = "pdf.min.mjs", path = "pdfjs/pdf.min.mjs" },
      { name = "pdf.worker.min.mjs", path = "pdfjs/pdf.worker.min.mjs" }
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

  local width        = opt('width')
  local height       = opt('height')
  local border       = opt('border')
  local class        = opt('class')
  local button       = opt('button')
  local renderer     = opt('renderer', 'auto')
  local toolbar      = opt('toolbar', 'true')
  local page         = opt('page')
  local image        = opt('image')
  local image_force  = opt('image_force')
  local image_width  = opt('image_width')
  local image_height = opt('image_height')
  local image_border = opt('image_border')
  local image_class  = opt('image_class')

  if renderer ~= 'auto' and renderer ~= 'native' and renderer ~= 'pdfjs' then
    quarto.log.warning("embedpdf: unknown renderer '" .. renderer .. "', using 'auto'")
    renderer = 'auto'
  end

  -- non-HTML formats -------------------------------------------------------

  if quarto.doc.is_format("latex") then
    quarto.doc.use_latex_package("pdfpages")
    return pandoc.RawBlock('latex', '\\includepdf[pages=-]{' .. src .. '}')
  end

  if not quarto.doc.is_format("html:js") then
    -- epub, docx, gfm, typst, ...: emit a plain link instead of dropping content
    local link = pandoc.Link(button ~= '' and button or "Download PDF file", src)
    if context == "block" then
      return pandoc.Para({ link })
    end
    return link
  end

  -- HTML -------------------------------------------------------------------

  inject_dependency()

  local esc_src = html_escape(src)

  -- fallback image markup (shown when JS is off, or exclusively with image_force)
  local img_html = ''
  if image ~= '' then
    img_html = '<img src="' .. html_escape(image) .. '" alt="PDF preview"'
    if image_width  ~= '' then img_html = img_html .. ' width="'  .. html_escape(image_width)  .. '"' end
    if image_height ~= '' then img_html = img_html .. ' height="' .. html_escape(image_height) .. '"' end
    if image_class  ~= '' then img_html = img_html .. ' class="'  .. html_escape(image_class)  .. '"' end
    if image_border ~= '' then img_html = img_html .. ' border="' .. html_escape(image_border) .. '"' end
    img_html = img_html .. ' />'
  end

  local button_html = ''
  if button ~= '' then
    button_html = '<p><a class="embedpdf-btn" href="' .. esc_src .. '" download>' ..
                  html_escape(button) .. '</a></p>'
  end

  local html
  if image_force == 'TRUE' or image_force == 'true' then
    -- image only, linked to the pdf (no viewer)
    html = '<a href="' .. esc_src .. '" download>' .. img_html .. '</a>' .. button_html
  else
    local fallback
    if img_html ~= '' then
      fallback = '<a href="' .. esc_src .. '" download>' .. img_html .. '</a>'
    else
      fallback = '<a href="' .. esc_src .. '" download>Download PDF file.</a>'
    end

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
    html = div .. '>' .. fallback .. '</div>' .. button_html
  end

  if context == "block" then
    return pandoc.RawBlock('html', html)
  end
  return pandoc.RawInline('html', html)
end

-- alias shortcode
function embedpdf(...)
  return pdf(...)
end
