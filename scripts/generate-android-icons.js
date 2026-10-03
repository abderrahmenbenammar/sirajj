/* Generates every Android launcher icon (legacy + adaptive foreground) from a
 * single source PNG into android/app/src/main/res/mipmap-*.
 *
 *   node scripts/generate-android-icons.js [source.png]
 *
 * Source defaults to assets/icon.png. Adaptive XMLs
 * (mipmap-anydpi-v26/ic_launcher*.xml) and the background color
 * (#FFFFFF, values/ic_launcher_background.xml) already exist and stay as-is.
 * Re-run after changing the source, then: npx cap sync android && gradlew assembleDebug. */
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const ROOT = path.resolve(__dirname, "..");
const RES = path.join(ROOT, "android", "app", "src", "main", "res");
const SOURCE = path.resolve(ROOT, process.argv[2] || "assets/icon.png");

// density -> scale factor (mdpi = 1x)
const DENSITIES = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

// Legacy launcher size (dp) and adaptive foreground canvas size (dp).
const LEGACY_DP = 48;
const FOREGROUND_DP = 108;
// Fraction of the canvas occupied by the source image box.
const LEGACY_LOGO = 0.78;
const ROUND_LOGO = 0.72;
const FOREGROUND_LOGO = 0.7; // keeps key content inside the 66dp safe zone

const BACKGROUND = "#FFFFFF";

function px(dp, scale) {
  return Math.round(dp * scale);
}

function drawCentered(ctx, img, canvasSize, fraction) {
  const box = Math.round(canvasSize * fraction);
  const offset = Math.round((canvasSize - box) / 2);
  ctx.drawImage(img, offset, offset, box, box);
}

async function writePng(filePath, width, height, draw) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  draw(ctx, width, height);
  fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
  const stat = fs.statSync(filePath);
  console.log(
    `  ${path.relative(ROOT, filePath).replace(/\\/g, "/")}  ${width}x${height}  ${(stat.size / 1024).toFixed(1)} KB`,
  );
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source image not found: ${SOURCE}`);
    process.exit(1);
  }
  const img = await loadImage(SOURCE);

  // Probe the source background so surprises (solid color box) are visible.
  const probe = createCanvas(img.width, img.height);
  const pctx = probe.getContext("2d");
  pctx.drawImage(img, 0, 0);
  const corner = pctx.getImageData(2, 2, 1, 1).data;
  console.log(
    `Source: ${path.relative(ROOT, SOURCE)} (${img.width}x${img.height}), corner rgba = ${corner[0]},${corner[1]},${corner[2]},${corner[3]}`,
  );

  for (const [density, scale] of Object.entries(DENSITIES)) {
    const dir = path.join(RES, `mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });
    const legacy = px(LEGACY_DP, scale);
    const foreground = px(FOREGROUND_DP, scale);
    console.log(`mipmap-${density}:`);

    // Legacy square icon: full-bleed background + centered mark.
    await writePng(path.join(dir, "ic_launcher.png"), legacy, legacy, (ctx, w, h) => {
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, w, h);
      drawCentered(ctx, img, w, LEGACY_LOGO);
    });

    // Legacy round icon: white circle on transparency + centered mark.
    await writePng(path.join(dir, "ic_launcher_round.png"), legacy, legacy, (ctx, w) => {
      ctx.fillStyle = BACKGROUND;
      ctx.beginPath();
      ctx.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
      ctx.fill();
      drawCentered(ctx, img, w, ROUND_LOGO);
    });

    // Adaptive foreground (transparent; background = @color/ic_launcher_background).
    await writePng(path.join(dir, "ic_launcher_foreground.png"), foreground, foreground, (ctx, w, h) => {
      drawCentered(ctx, img, w, FOREGROUND_LOGO);
    });
  }

  console.log("Done. Adaptive XMLs unchanged; then run: npx cap sync android && gradlew assembleDebug");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
