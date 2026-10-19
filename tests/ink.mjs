// The ink rule that render_check.mjs and ios_check.mjs share.
//
// inkInPixels(data) takes the RGBA bytes of a canvas (ImageData.data) and is
// true when at least one pixel is not transparent (alpha above 0) and not white
// (red, green, or blue below 250). It reads every pixel and every channel.
//
// The scripts run it inside a page, from its source text (Function.toString),
// so it must use no names from outside its own body.
export function inkInPixels(data) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0 && (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250)) return true;
  }
  return false;
}
