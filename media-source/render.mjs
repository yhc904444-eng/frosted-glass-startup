import {createRequire} from 'node:module';
import path from 'node:path';
import {mkdir, writeFile, copyFile} from 'node:fs/promises';
import {verifyOne, makeContactSheet, shared, root, getArg, contactFrames, readSharp} from './verify.mjs';

const requireShared = createRequire(path.join(shared, '../package.json'));
const {bundle} = requireShared('@remotion/bundler');
const {selectComposition, renderMedia, renderStill, openBrowser} = requireShared('@remotion/renderer');
const proof = process.argv.includes('--proof');
const scale = Number(getArg('scale') || 1);
const concurrency = Number(getArg('concurrency') || 4);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw Error('--concurrency must be 1 to 4.');
if (!Number.isFinite(scale) || scale <= 0 || scale > 1) throw Error('--scale must be greater than 0 and no greater than 1.');
const requestedFrames = getArg('frames');
const frames = requestedFrames ? requestedFrames.split(',').map(Number) : contactFrames;
if (frames.some(n => !Number.isInteger(n) || n < 0 || n >= 1020)) throw Error('--frames accepts comma-separated integers between 0 and 1019.');
const browserExecutable = process.env.CHROME_PATH || undefined;
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.tsx'), outDir: path.join(root, 'build'), publicDir: path.join(root, 'public'), webpackOverride: config => ({...config, resolve: {...config.resolve, modules: [shared, ...(config.resolve?.modules || ['node_modules'])]}})});
console.log(JSON.stringify({stage: 'bundle-ready', proof, scale, concurrency}));
const browser = await openBrowser('chrome', {browserExecutable});
try {
  const dir = path.join(root, 'renders', 'wide');
  await mkdir(dir, {recursive: true});
  const composition = await selectComposition({serveUrl, id: 'PrintWide', puppeteerInstance: browser, browserExecutable});
  if (composition.fps !== 60 || composition.durationInFrames !== 1020 || composition.width !== 1920 || composition.height !== 1080) throw Error('Composition must be 1920×1080, 60 fps, and 1020 frames.');
  if (proof) {
    const shots = [];
    for (const frame of frames) {
      const output = path.join(dir, `proof-${frame}.png`);
      await renderStill({serveUrl, composition, puppeteerInstance: browser, browserExecutable, frame, scale, output, imageFormat: 'png', timeoutInMilliseconds: 120000});
      shots.push({file: output, frame});
      console.log(JSON.stringify({stage: 'proof-frame', frame}));
    }
    await makeContactSheet(shots, path.join(dir, 'contact-sheet.jpg'));
    await mkdir(path.join(root, 'qa'), {recursive: true});
    const result = {passed: true, revision: 'liquid-glass-print-17s-v1', installed: false, proof: true, scale, frames, output: dir};
    await writeFile(path.join(root, 'qa', 'proof.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } else {
    let lastPercent = -1;
    if (!process.argv.includes('--finish-only')) {
      await renderMedia({serveUrl, composition, puppeteerInstance: browser, browserExecutable, outputLocation: path.join(dir, 'registration-print.mp4'), codec: 'h264', crf: 17, pixelFormat: 'yuv420p', muted: true, concurrency, scale, imageFormat: 'png', timeoutInMilliseconds: 120000,
        // Start a fresh prediction group at the static hold, so the default
        // 250-frame encoder refresh cannot change its texture partway through.
        ffmpegOverride: ({args}) => [...args.slice(0,-1), '-force_key_frames', '15.8', ...args.slice(-1)],
        onProgress: ({progress, renderedFrames}) => {const percent = Math.floor(progress * 20) * 5; if (percent !== lastPercent) {lastPercent = percent; console.log(JSON.stringify({stage: 'render', percent, renderedFrames}));}},
      });
    }
    const result = await verifyOne('wide', {width: Math.round(composition.width * scale), height: Math.round(composition.height * scale)});
    await writeFile(path.join(dir, 'render.json'), JSON.stringify(result, null, 2));
    await mkdir(path.join(root, 'qa'), {recursive: true});
    await writeFile(path.join(root, 'qa', 'media.json'), JSON.stringify({passed: true, revision: 'liquid-glass-print-17s-v1', createdAt: new Date().toISOString(), installed: false, results: [result]}, null, 2));
    if (scale === 1) {
      const assets = path.resolve(root, '../assets');
      await mkdir(assets, {recursive: true});
      await copyFile(result.video, path.join(assets, 'startup-wide.mp4'));
      await copyFile(result.final, path.join(assets, 'final-wide.png'));
      await readSharp()(result.final).resize(960, 540).blur(24).png().toFile(path.join(assets, 'backdrop.png'));
    }
    console.log(JSON.stringify({passed: true, result}, null, 2));
  }
} finally {
  await browser.close({silent: true});
}
