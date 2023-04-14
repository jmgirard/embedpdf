function pdf(args, kwargs)
  local data = pandoc.utils.stringify(args[1])
  local width = pandoc.utils.stringify(kwargs['width'])
  local height = pandoc.utils.stringify(kwargs['height'])
  
  if width ~= '' then
    width = 'width="' .. width .. '" '
  end
  
  if height ~= '' then
    height = 'height="' .. height .. '" '
  end
  
  -- detect html
  if quarto.doc.isFormat("html:js") then
    return pandoc.RawInline('html', '<object data="' .. data .. '" type="application/pdf"' .. width .. height .. '><p>Unable to display PDF file. <a href="' .. data .. '">Download</a> instead.</p></object>')
  else
    return pandoc.Null()
  end

end

function embedpdf(...)
  return pdf(...)
end
