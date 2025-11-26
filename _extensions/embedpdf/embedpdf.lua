-- simple HTML escaper for text nodes
local function html_escape(s)
  s = tostring(s or "")
  s = s:gsub("&", "&amp;")
       :gsub("<", "&lt;")
       :gsub(">", "&gt;")
       :gsub('"', "&quot;")
       :gsub("'", "&#39;")
  return s
end

function pdf(args, kwargs)
  local data         = pandoc.utils.stringify(args[1]) or pandoc.utils.stringify(kwargs['file'])
  local width        = pandoc.utils.stringify(kwargs['width'])
  local height       = pandoc.utils.stringify(kwargs['height'])
  local border       = pandoc.utils.stringify(kwargs['border'])
  local class        = pandoc.utils.stringify(kwargs['class'])
  local button       = pandoc.utils.stringify(kwargs['button'])
  local image        = pandoc.utils.stringify(kwargs['image'])
  local image_force  = pandoc.utils.stringify(kwargs['image_force'])
  local image_width  = pandoc.utils.stringify(kwargs['image_width'])
  local image_height = pandoc.utils.stringify(kwargs['image_height'])
  local image_border = pandoc.utils.stringify(kwargs['image_border'])
  local image_class  = pandoc.utils.stringify(kwargs['image_class'])

  if width ~= '' then
    width = ' width="' .. width .. '"'
  end

  if height ~= '' then
    height = ' height="' .. height .. '"'
  end

  if border ~= '' then
    border = ' border="' .. border .. '"'
  end

  if class ~= '' then
    class = ' class="' .. class .. '"'
  end

  if image_width ~= '' then
    image_width = ' width="' .. image_width .. '"'
  end

  if image_height ~= '' then
    image_height = ' height="' .. image_height .. '"'
  end

  if image_border ~= '' then
    image_border = ' border="' .. image_border .. '"'
  end

  if image_class ~= '' then
    image_class = ' class="' .. image_class .. '"'
  end

  local button_html = ""
  if button ~= '' then
    button_html =
      "<br><a href='" .. data .. "' download" ..
      " style='display:inline-block; padding:10px 18px; background-color:#007acc; color:white; font-size:15px; border:none; border-radius:6px; cursor:pointer; text-decoration:none; transition:background-color 0.2s ease;'" ..
      " onmouseover=\"this.style.backgroundColor='#005fa3';\"" ..
      " onmouseout=\"this.style.backgroundColor='#007acc';\">" ..
      html_escape(button) ..
      "</a>"
  end

  if quarto.doc.isFormat("html:js") then
    local html = ""

    if image_force == 'TRUE' then
      -- image only, linked to pdf
      html = '<a href="' .. data .. '" download>' ..
             '<img src="' .. image .. '"' .. image_width .. image_height .. image_class .. image_border .. ' />' ..
             '</a>'
    elseif image ~= '' then
      -- pdf object with image fallback
      html = '<object data="' .. data .. '" type="application/pdf"' .. width .. height .. class .. border .. '>' ..
             '<a href="' .. data .. '" download>' ..
             '<img src="' .. image .. '"' .. image_width .. image_height .. image_class .. image_border .. ' />' ..
             '</a>' ..
             '</object>'
    else
      -- pdf object with text fallback
      html = '<object data="' .. data .. '" type="application/pdf"' .. width .. height .. class .. border .. '>' ..
             '<a href="' .. data .. '" download>Download PDF file.</a>' ..
             '</object>'
    end

    -- wrap main content + optional button
    if button_html ~= "" then
      html = "<div>" .. html .. button_html .. "</div>"
    end

    return pandoc.RawInline('html', html)
  else
    return pandoc.Null()
  end
end


-- Add alias shortcode
function embedpdf(...)
  return pdf(...)
end
