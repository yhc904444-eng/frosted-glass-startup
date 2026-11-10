import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

export const root = path.dirname(fileURLToPath(import.meta.url));
export const shared = path.resolve(process.env.FROSTED_MEDIA_NODE_MODULES || path.join(root, 'node_modules'));
export const getArg = name => process.argv.find(a => a.startsWith('--' + name + '='))?.slice(name.length + 3);
export function parseFormats(input = 'all') {
  const formats = input === 'all' ? ['wide'] : [input];
  if (formats.some(f => !['wide'].includes(f))) throw Error('--format must be wide.');
  return formats;
}
export function readSharp() {
  return createRequire(path.join(shared, '../package.json'))('sharp');
}
const platform = process.platform === 'win32' ? 'win32-x64-msvc' : process.platform === 'darwin' ? (process.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64') : 'linux-x64-gnu';
const binaryDir = path.join(shared, '@remotion/compositor-' + platform);
const ffmpeg = path.join(binaryDir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
const ffprobe = path.join(binaryDir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
const run = args => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-xerror', ...args], {maxBuffer: 128 * 1024 * 1024, windowsHide: true});
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
export const contactFrames = [0, 120, 220, 339, 460, 578, 696, 800, 900, 948, 1019];
const holdStart = 948;
const lastFrame = 1019;
// Thirteen samples cover the entire final 72-frame hold, including both ends.
const holdFrames = Array.from({length: 13}, (_, i) => Math.round(holdStart + i * (lastFrame - holdStart) / 12));

export async function makeContactSheet(shots, output) {
  const sharp = readSharp(), thumbs = [];
  const width = 640, imageHeight = 360, height = 390, columns = 3;
  for (const [i, shot] of shots.entries()) {
    const label = Buffer.from(`<svg width="640" height="30"><text x="14" y="21" fill="#cbd5dc" font-size="14" font-family="Arial">${(shot.frame / 60).toFixed(2)} s / frame ${shot.frame}</text></svg>`);
    const input = await sharp(shot.file).resize(width, imageHeight, {fit: 'contain', background: '#111a22'}).extend({bottom: 30, top: 0, left: 0, right: 0, background: '#111a22'}).composite([{input: label, left: 0, top: imageHeight}]).png().toBuffer();
    thumbs.push({input, left: i % columns * width, top: Math.floor(i / columns) * height});
  }
  await sharp({create: {width: columns * width, height: Math.ceil(shots.length / columns) * height, channels: 3, background: '#111a22'}}).composite(thumbs).jpeg({quality: 93}).toFile(output);
}

export async function verifyOne(format, expected = {}) {
  const width = expected.width || {wide: 1920, medium: 1728, standard: 1440}[format];
  const height = expected.height || 1080;
  const dir = path.join(root, 'renders', format), file = path.join(dir, 'registration-print.mp4');
  if (!existsSync(file)) throw Error('Video missing: ' + file);
  const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file], {encoding: 'utf8', windowsHide: true}));
  const video = probe.streams.find(s => s.codec_type === 'video');
  const audioStreams = probe.streams.filter(s => s.codec_type === 'audio').length;
  const frames = Number(video?.nb_read_frames);
  const duration = Number(probe.format.duration);
  if (video?.width !== width || video?.height !== height || video?.avg_frame_rate !== '60/1' || frames !== 1020 || audioStreams !== 0 || Math.abs(duration - 17) > .01) {
    throw Error('Unexpected video metadata: ' + JSON.stringify({format, width: video?.width, height: video?.height, fps: video?.avg_frame_rate, frames, audioStreams, duration}));
  }
  run(['-i', file, '-map', '0:v:0', '-an', '-c:v', 'rawvideo', '-f', 'null', '-']);
  const stillDir = path.join(root, 'qa', 'decoded-stills', format);
  mkdirSync(stillDir, {recursive: true});
  // The bundled FFmpeg omits the select filter. Decode output-side seeks so
  // each PNG corresponds to the requested exact 60 fps frame, including 1019.
  // Sampling avoids writing 72 full-resolution tail images for each format.
  const selected = [...new Set([...contactFrames, ...holdFrames])].sort((a, b) => a - b);
  const pngByFrame = new Map(selected.map(frame => [frame, path.join(stillDir, `frame-${String(frame).padStart(4, '0')}.png`)]));
  for (const frame of selected) {
    run(['-y', '-i', file, '-ss', String(frame / 60), '-map', '0:v:0', '-an', '-vsync', '0', '-frames:v', '1', '-compression_level', '2', pngByFrame.get(frame)]);
  }
  if (selected.some(frame => !existsSync(pngByFrame.get(frame)))) throw Error('An expected decoded PNG frame is missing.');
  const sharp = readSharp();
  const sampledBrightness=[];
  for(const frame of contactFrames){
    const stats=await sharp(pngByFrame.get(frame)).removeAlpha().stats();
    const means=stats.channels.slice(0,3).map(c=>c.mean);sampledBrightness.push({frame,means});
    // Pale unprinted paper is intentional; retain measured brightness as evidence without a white-frame rejection.
  }
  const reference = await sharp(pngByFrame.get(holdStart)).removeAlpha().raw().toBuffer();
  let maximumMeanError = 0, maximumChangedPixelFraction = 0;
  for (const frame of holdFrames.slice(1)) {
    const pixels = await sharp(pngByFrame.get(frame)).removeAlpha().raw().toBuffer();
    if (pixels.length !== reference.length) throw Error('PNG pixel dimensions changed during final hold.');
    let error = 0, changedPixels = 0;
    for (let i = 0; i < pixels.length; i += 3) {
      let changed = false;
      for (let c = 0; c < 3; c++) {const d = Math.abs(pixels[i + c] - reference[i + c]); error += d; if (d > 2) changed = true;}
      if (changed) changedPixels++;
    }
    maximumMeanError = Math.max(maximumMeanError, error / pixels.length);
    maximumChangedPixelFraction = Math.max(maximumChangedPixelFraction, changedPixels / (pixels.length / 3));
  }
  const final = path.join(dir, 'final.png');
  writeFileSync(final, readFileSync(pngByFrame.get(lastFrame)));
  await makeContactSheet(contactFrames.map(frame => ({file: pngByFrame.get(frame), frame})), path.join(dir, 'contact-sheet.jpg'));
  const holdPassed = maximumMeanError <= .35 && maximumChangedPixelFraction <= .03;
  const result = {passed: holdPassed, revision: 'liquid-glass-print-17s-v1', installed: false, format, width, height, fps: 60, frames, duration, audioStreams, allFramesDecoded: true, sampledBrightness,
    finalFrameIndex: lastFrame, finalHold: {fromFrame: holdStart, toFrame: lastFrame, durationFrames: 72, comparedPngFrames: holdFrames.length, sampledFrames: holdFrames, maximumMeanChannelError: maximumMeanError, maximumChangedPixelFraction, meanErrorThreshold: .35, changedPixelFractionThreshold: .03, passed: holdPassed},
    video: file, final, contactSheet: path.join(dir, 'contact-sheet.jpg'), sha256: sha(file), finalFrameSha256: sha(final)};
  writeFileSync(path.join(dir, 'verification.json'), JSON.stringify(result, null, 2));
  // Only exact filenames produced by this run are removed; folders and unrelated files are retained.
  for (const png of pngByFrame.values()) unlinkSync(png);
  if (!holdPassed) throw Error('Final 1.2-second hold is moving: ' + JSON.stringify(result.finalHold));
  console.log(JSON.stringify({stage: 'verified', ...result}));
  return result;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const scale = Number(getArg('scale') || 1);
  if (!Number.isFinite(scale) || scale <= 0 || scale > 1) throw Error('Invalid --scale.');
  const results = [];
  for (const format of parseFormats(getArg('format') || 'all')) results.push(await verifyOne(format, {width: Math.round({wide: 1920, medium: 1728, standard: 1440}[format] * scale), height: Math.round(1080 * scale)}));
  mkdirSync(path.join(root, 'qa'), {recursive: true});
  writeFileSync(path.join(root, 'qa', 'media.json'), JSON.stringify({passed: true, revision: 'liquid-glass-print-17s-v1', createdAt: new Date().toISOString(), installed: false, results}, null, 2));
  console.log(JSON.stringify({passed: true, results}, null, 2));
}
