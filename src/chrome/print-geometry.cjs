// Print geometry behind the @media print rules in editor.css: the screen paper
// (884x630 px, padding and footer included) is scaled uniformly into an A4
// landscape frame that leaves 1 mm below. Keep editor.css in step with this.
const PAPER = Object.freeze({ width: 884, height: 630, pageWidthMM: 297, pageHeightMM: 210, frameHeightMM: 209, dpi: 96 });
const mmToPx = value => value / 25.4 * PAPER.dpi;
const scale = Math.min(mmToPx(PAPER.pageWidthMM) / PAPER.width, mmToPx(PAPER.frameHeightMM) / PAPER.height);
const left = (mmToPx(PAPER.pageWidthMM) - PAPER.width * scale) / 2;
module.exports = { PAPER, scale, mmToPx, left };
