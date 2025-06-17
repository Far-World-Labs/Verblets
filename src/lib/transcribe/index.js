// Lazy import whisper to avoid initialization issues
let whisper;
let record;

async function getWhisper() {
  if (!whisper) {
    whisper = (await import('whisper-node')).default;
  }
  return whisper;
}

async function getRecord() {
  if (!record) {
    record = (await import('node-record-lpcm16')).default;
  }
  return record;
}

export default class Transcriber {
  constructor(targetWord, silenceDuration = 5000, wordPauseDuration = 2000) {
    this.targetWord = targetWord;
    this.silenceDuration = silenceDuration;
    this.wordPauseDuration = wordPauseDuration;
    this.transcription = '';
    this.lastTranscribedTime = Date.now();
    this.recording = null;
  }

  async startRecording() {
    const recordModule = await getRecord();
    this.recording = recordModule.record({
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

  async transcribe(stream) {
    const whisperModule = await getWhisper();
    whisperModule
      .transcribeStream(stream, { streaming: true })
      .then((transcription) => {
        this.handleTranscription(transcription);
      })
      .catch((error) => {
        console.error(error);
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
