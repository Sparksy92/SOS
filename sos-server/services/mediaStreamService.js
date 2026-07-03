const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function streamVideo(req, res, absolutePath) {
  const ext = path.extname(absolutePath).toLowerCase();
  
  if (['.mp4', '.webm'].includes(ext)) {
    console.log(`[STREAM] Serving native video via sendFile: ${absolutePath}`);
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
    '-movflags', 'fragmented+empty_moov+default_base_moof',
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
