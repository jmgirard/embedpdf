function pdf(args, kwargs)
  local data = pandoc.utils.stringify(args[1]) or pandoc.utils.stringify(kwargs['file'])
  local image = pandoc.utils.stringify(kwargs['image'])
  local width = pandoc.utils.stringify(kwargs['width'])
  local height = pandoc.utils.stringify(kwargs['height'])
  local class = pandoc.utils.stringify(kwargs['class'])
  local border = pandoc.utils.stringify(kwargs['border'])
  local force = pandoc.utils.stringify(kwargs['force_image'])
  
  if width ~= '' then
    width = 'width="' .. width .. '" '
  end
  
  if height ~= '' then
    height = 'height="' .. height .. '" '
  end
  
  if class ~= '' then
    class = 'class="' .. class .. '" '
  end
  
  if border ~= '' then
    border = 'border="' .. border .. '" '
  end
  
  -- detect html
  if quarto.doc.isFormat("html:js") then
    if force == 'TRUE' then
      return pandoc.RawInline('html', '<a href="' .. data .. '" download><img src="' .. image .. '" ' .. width .. height .. class .. border .. ' /></a>')
    end
    if image ~= '' then
      return pandoc.RawInline('html', '<object data="' .. data .. '" type="application/pdf"' .. width .. height .. class .. border .. '><a href="' .. data .. '" download><img src="' .. image .. '" ' .. width .. height .. class .. border .. ' /></a></object>')
    else
      return pandoc.RawInline('html', '<object data="' .. data .. '" type="application/pdf"' .. width .. height .. class .. border .. '><a href="' .. data .. '" download>Download PDF file.</a></object>')
    end
  else
    return pandoc.Null()
  end

end

function embedpdf(...)
  return pdf(...)
end

-- experimental

function pdfjs(args, kwargs, ...)
  local data = pandoc.utils.stringify(args[1])
  local class = pandoc.utils.stringify(kwargs['class'])
  
  if class ~= '' then
    class = 'class="' .. class .. '" '
  end
  
  if quarto.doc.isFormat("html:js") then
    return pandoc.RawInline('html', '<div><iframe src="/pdfjs/web/viewer.html?file=../../' .. data .. '" ' .. class .. '></iframe></div>')
  else
    return pandoc.Null()
  end
  
end
