const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const cliProgress = require('cli-progress');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const sourceDir = path.join(__dirname, 'source');
const exportDir = path.join(__dirname, 'export');

// Ensure export directory exists
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir);
}

async function promptUser(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function getCompressionSettings() {
  console.log('\nCompression options:');
  console.log('1. Low (Faster, larger file size, why you no like skrimp?)');
  console.log('2. Medium (Recommended for optimal size and quality, but still not skrimp)');
  console.log('3. WHoooo Daddy! Thats that skrimp! (Slower, smaller file size, but 3 plates of skrimp🍤)');

  const compressionChoice = await promptUser('Choose a compression option (1-3): ');

  switch (compressionChoice) {
    case '1':
      return '-c:v libvpx-vp9 -crf 30 -b:v 0 -b:a 128k -c:a libopus';
    case '2':
      return '-c:v libvpx-vp9 -crf 23 -b:v 0 -b:a 128k -c:a libopus';
    case '3':
      return '-c:v libvpx-vp9 -crf 15 -b:v 0 -b:a 128k -c:a libopus';
    default:
      console.log('Invalid choice. Using medium compression.');
      return '-c:v libvpx-vp9 -crf 23 -b:v 0 -b:a 128k -c:a libopus';
  }
}

async function convertFile(file, compressionSettings) {
  const sourcePath = path.join(sourceDir, file);
  const destinationPath = path.join(exportDir, `${path.parse(file).name}.webm`);

  // Get the duration of the input file
  const durationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${sourcePath}"`;
  const duration = parseFloat(await new Promise((resolve) => exec(durationCommand, (error, stdout) => resolve(stdout.trim()))));

  const ffmpegCommand = `ffmpeg -i "${sourcePath}" ${compressionSettings} -deadline good -cpu-used 2 "${destinationPath}"`;

  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(100, 0);

  return new Promise((resolve, reject) => {
    const conversionProcess = exec(ffmpegCommand);

    conversionProcess.stderr.on('data', (data) => {
      const match = data.match(/time=(\d{2}):(\d{2}):(\d{2})\.\d{2}/);
      if (match) {
        const [, hours, minutes, seconds] = match;
        const currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
        const progress = Math.min(Math.floor((currentTime / duration) * 100), 100);
        progressBar.update(progress);
      }
    });

    conversionProcess.on('close', (code) => {
      progressBar.stop();
      if (code === 0) {
        console.log(`\nConverted ${file} successfully!`);
        resolve();
      } else {
        console.error(`\nConversion failed for ${file}. Please check the file and try again.`);
        reject(new Error(`Conversion failed for ${file}`));
      }
    });

    conversionProcess.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });
  });
}

async function main() {
  try {
    const files = fs.readdirSync(sourceDir).filter(file => ['.mp4', '.mov'].includes(path.extname(file).toLowerCase()));

    if (files.length === 0) {
      console.log('No .mp4 or .mov files found in the source directory.');
      return;
    }

    console.log('Files to be converted:');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });

    const compressionSettings = await getCompressionSettings();

    for (const file of files) {
      await convertFile(file, compressionSettings);
    }

    console.log('\nAll conversions skrimpt! Hope you got that skrimp!');
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    rl.close();
  }
}

main();
