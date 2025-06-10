import whisper from 'whisper-node';
import record from 'node-record-lpcm16';
import logger from '../logger/index.js';

export default class Transcriber {
  constructor(targetWord, silenceDuration = 5000, wordPauseDuration = 2000) {
    this.targetWord = targetWord;
    this.silenceDuration = silenceDuration;
    this.wordPauseDuration = wordPauseDuration;
    this.transcription = '';
    this.lastTranscribedTime = Date.now();
    this.recording = null;
  }

  startRecording() {
    this.recording = record.record({
      sampleRateHertz: 16000,
      threshold: 0,
      recordProgram: 'rec',
      silence: '5.0',
    });

    const audioStream = this.recording.stream();
    this.transcribe(audioStream);
  }

  stopRecording() {
    if (this.recording) {
      this.recording.stop();
    }
  }

  transcribe(stream) {
    whisper
      .transcribeStream(stream, { streaming: true })
      .then((transcription) => {
        this.handleTranscription(transcription);
      })
      .catch((error) => {
        logger.error(error);
      });
  }

  handleTranscription(transcription) {
    this.transcription += transcription;
    this.lastTranscribedTime = Date.now();

    if (transcription.includes(this.targetWord)) {
      setTimeout(() => {
        this.stopRecording();
      }, this.wordPauseDuration);
    }

    if (Date.now() - this.lastTranscribedTime >= this.silenceDuration) {
      this.stopRecording();
    }
  }

  getText() {
    return this.transcription;
  }
}
