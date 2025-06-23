import { describe, it, expect } from 'vitest';
import conversationTurn from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('conversation-turn examples', () => {
  it(
    'AI-powered therapeutic conversation',
    async () => {
      // Simulate an AI therapist conducting a session
      const therapist = {
        id: 'therapist',
        name: 'Dr. Elena Rodriguez',
        bio: 'Licensed clinical psychologist specializing in cognitive behavioral therapy and trauma-informed care',
        agenda: 'Help client process emotions and develop healthy coping strategies',
      };

      const conversationHistory = [
        {
          id: 'client',
          name: 'Sarah',
          comment: "I've been having panic attacks at work lately. They come out of nowhere.",
          time: '10:15',
        },
        {
          id: 'therapist',
          name: 'Dr. Elena Rodriguez',
          comment:
            'That sounds really frightening. Can you tell me what happens right before these panic attacks start?',
          time: '10:16',
        },
        {
          id: 'client',
          name: 'Sarah',
          comment:
            "Usually it's when my boss calls me into meetings. My heart starts racing and I can't breathe.",
          time: '10:17',
        },
        {
          id: 'therapist',
          name: 'Dr. Elena Rodriguez',
          comment:
            'It sounds like there might be a pattern here. What thoughts go through your mind when you see that meeting invitation?',
          time: '10:18',
        },
        {
          id: 'client',
          name: 'Sarah',
          comment:
            "I immediately think I'm in trouble, that I've done something wrong, even when I know I haven't.",
          time: '10:19',
        },
      ];

      console.log('🧠 AI Therapeutic Session 🧠\n');
      console.log('Building therapeutic rapport and using CBT techniques...\n');

      const response = await conversationTurn({
        speaker: therapist,
        topic: 'workplace anxiety and panic attacks',
        history: conversationHistory,
        rules: {
          customPrompt:
            'Use cognitive behavioral therapy techniques. Ask open-ended questions, reflect emotions, and help identify thought patterns. Be empathetic and professional.',
        },
      });

      console.log(`Dr. Elena Rodriguez:`);
      console.log(`"${response}"\n`);

      // Verify therapeutic response quality
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(30);

      console.log(
        '✅ AI therapist provided empathetic, clinically-informed response using CBT techniques'
      );
    },
    longTestTimeout
  );

  it(
    'expert witness legal testimony',
    async () => {
      // Simulate an expert witness in a cybersecurity case
      const expert = {
        id: 'expert',
        name: 'Dr. Michael Zhang',
        bio: 'Cybersecurity expert with 20 years experience, former NSA analyst, PhD in Computer Science',
        agenda: 'Provide clear, accurate technical testimony that a jury can understand',
      };

      const courtHistory = [
        {
          id: 'attorney',
          name: 'Prosecutor',
          comment:
            "Dr. Zhang, can you explain to the jury how the defendant allegedly accessed the company's secure database?",
          time: '14:30',
        },
        {
          id: 'expert',
          name: 'Dr. Michael Zhang',
          comment:
            'Certainly. Based on the digital evidence, the defendant used a technique called SQL injection to bypass the database security.',
          time: '14:31',
        },
        {
          id: 'attorney',
          name: 'Prosecutor',
          comment: 'Can you explain SQL injection in terms the jury can understand?',
          time: '14:32',
        },
        {
          id: 'expert',
          name: 'Dr. Michael Zhang',
          comment:
            'Think of it like tricking a security guard. The database expects normal questions, but the defendant sent malicious code disguised as a legitimate query.',
          time: '14:33',
        },
        {
          id: 'attorney',
          name: 'Prosecutor',
          comment: 'And what evidence shows the defendant specifically performed this action?',
          time: '14:34',
        },
      ];

      console.log('⚖️ Expert Witness Testimony ⚖️\n');
      console.log(
        'Providing technical expertise in accessible language for legal proceedings...\n'
      );

      const response = await conversationTurn({
        speaker: expert,
        topic: 'cybersecurity breach investigation and digital forensics evidence',
        history: courtHistory,
        rules: {
          customPrompt:
            'You are testifying as an expert witness in court. Be precise, factual, and explain technical concepts in ways a jury can understand. Maintain professional credibility.',
        },
      });

      console.log(`Dr. Michael Zhang (Expert Witness):`);
      console.log(`"${response}"\n`);

      // Verify expert testimony quality
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(40);

      console.log(
        '✅ Expert witness provided clear, credible technical testimony suitable for legal proceedings'
      );
    },
    longTestTimeout
  );

  it(
    'crisis counselor hotline response',
    async () => {
      // Simulate a crisis counselor responding to someone in distress
      const counselor = {
        id: 'counselor',
        name: 'Jamie Chen',
        bio: 'Certified crisis counselor with 8 years experience, trained in suicide prevention and de-escalation',
        agenda:
          'Ensure caller safety, provide emotional support, and connect to appropriate resources',
      };

      const callHistory = [
        {
          id: 'caller',
          name: 'Anonymous Caller',
          comment: "I don't know if I can keep going. Everything feels hopeless.",
          time: '22:15',
        },
        {
          id: 'counselor',
          name: 'Jamie Chen',
          comment:
            "I'm really glad you called tonight. It takes courage to reach out when you're feeling this way. You're not alone.",
          time: '22:16',
        },
        {
          id: 'caller',
          name: 'Anonymous Caller',
          comment:
            "I lost my job last month, my partner left me, and I can't pay rent. I feel like such a failure.",
          time: '22:17',
        },
      ];

      console.log('📞 Crisis Counseling Response 📞\n');
      console.log('Providing immediate emotional support and crisis intervention...\n');

      const response = await conversationTurn({
        speaker: counselor,
        topic: 'crisis intervention and emotional support',
        history: callHistory,
        rules: {
          customPrompt:
            'You are a trained crisis counselor. Prioritize safety, validate emotions, ask about suicide risk if appropriate, and provide hope. Use active listening and empathy.',
        },
      });

      console.log(`Jamie Chen (Crisis Counselor):`);
      console.log(`"${response}"\n`);

      // Verify crisis counseling response quality
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(25);

      console.log(
        '✅ Crisis counselor provided supportive, professional response following best practices for crisis intervention'
      );
    },
    longTestTimeout
  );
});
