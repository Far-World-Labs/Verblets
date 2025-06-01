import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import whisper from 'whisper-node';
import record from 'node-record-lpcm16';

export default class Transcriber {
  constructor(
    targetWord,
    {
      silenceDuration = 5000,
      cacheDir = process.env.VERBLETS_CACHE_DIR ||
        path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'verblets'),
    } = {}
  ) {
    this.targetWord = targetWord;
    this.silenceDuration = silenceDuration;
    this.cacheDir = cacheDir;
    this.transcription = '';
    this.recording = null;
    this.filePath = null;
    this._resolve = null;
    this._reject = null;
  }

  async startRecording() {
    await fsPromises.mkdir(this.cacheDir, { recursive: true });
    this.filePath = path.join(this.cacheDir, `recording-${Date.now()}.wav`);

    this.recording = record.record({
      sampleRate: 16000,
      silence: String(this.silenceDuration / 1000),
      endOnSilence: true,
      recorder: 'sox',
      audioType: 'wav',
    });

    const audioStream = this.recording.stream();
    audioStream.pipe(fs.createWriteStream(this.filePath));

    const promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    audioStream.on('error', (err) => {
      if (this._reject) this._reject(err);
    });

    this.recording.process.on('close', async () => {
      try {
        const transcriptArray = await whisper(this.filePath);
        const text = transcriptArray.map((line) => line.speech).join(' ');
        this.transcription = text;
        if (this._resolve) this._resolve(text);
      } catch (err) {
        if (this._reject) this._reject(err);
      }
    });

    return promise;
  }

  stopRecording() {
    if (this.recording) {
      this.recording.stop();
      this.recording = null;
    }
  }

  getText() {
    return this.transcription;
  }
}
