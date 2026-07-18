const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

function isNativeCodec(absolutePath) {
  try {
    const codec = execFileSync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name',
      '-of', 'csv=p=0',
      absolutePath
    ], { encoding: 'utf8' }).trim();
    // Native codecs universally supported by web browsers
    return ['h264', 'vp9', 'av1', 'vp8'].includes(codec.toLowerCase());
  } catch (e) {
    // If ffprobe is missing or fails, assume true for .mp4/.webm to prevent useless transcode crash
    const ext = path.extname(absolutePath).toLowerCase();
    if (['.mp4', '.webm'].includes(ext)) {
      return true;
    }
    return false;
  }
}

function streamVideo(req, res, absolutePath) {
  const ext = path.extname(absolutePath).toLowerCase();
  
  if (['.mp4', '.webm'].includes(ext) && isNativeCodec(absolutePath)) {
    console.log(`[STREAM] Serving native video via sendFile: ${absolutePath}`);
    return res.sendFile(absolutePath);
  }
  
  // Verify ffmpeg exists before trying to spawn it
  let hasFfmpeg = true;
  try {
    const { execSync } = require('child_process');
    execSync('which ffmpeg', { stdio: 'ignore' });
  } catch (e) {
    hasFfmpeg = false;
  }

  if (!hasFfmpeg) {
    console.warn(`[STREAM] FFmpeg not found on system. Falling back to native file transfer.`);
    return res.sendFile(absolutePath);
  }

  console.log(`[TRANSCODE] Starting FFmpeg real-time transcode for: ${absolutePath}`);
  
  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked'
  });

  const ffmpeg = spawn('ffmpeg', [
    '-i', absolutePath,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-pix_fmt', 'yuv420p',
    '-movflags', 'empty_moov+default_base_moof+frag_keyframe',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-f', 'mp4',
    'pipe:1'
  ]);

  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on('data', (data) => {
    // Optional: Log transcoding debugging logs if needed
  });

  req.on('close', () => {
    console.log('[TRANSCODE] Connection closed, terminating FFmpeg process.');
    ffmpeg.kill('SIGKILL');
  });

  ffmpeg.on('error', (err) => {
    console.error(`[TRANSCODE] FFmpeg error for ${absolutePath}:`, err);
  });
}

module.exports = { streamVideo };
