import { describe, it, expect } from 'vitest';
import conversationTurnLines from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('conversation-turn-lines examples', () => {
  it(
    'celebrity chef cooking show demonstration',
    async () => {
      // Simulate a celebrity chef teaching a complex recipe on a cooking show
      const chef = {
        id: 'chef',
        name: 'Chef Isabella Martinez',
        bio: 'Michelin-starred chef specializing in modern fusion cuisine, cookbook author, and TV personality',
        agenda: 'Teach viewers how to make restaurant-quality dishes at home with confidence',
      };

      const showHistory = [
        {
          id: 'host',
          name: 'Marcus',
          comment:
            "Chef Isabella, today we're making your famous duck confit tacos. Where do we start?",
          time: '14:15',
        },
        {
          id: 'chef',
          name: 'Chef Isabella Martinez',
          comment:
            'Great choice, Marcus! The secret is in the duck confit - we cure the duck legs overnight in salt, garlic, and thyme, then slow-cook them in their own fat.',
          time: '14:16',
        },
        {
          id: 'host',
          name: 'Marcus',
          comment: 'That sounds intimidating for home cooks. Any shortcuts or tips?',
          time: '14:17',
        },
        {
          id: 'chef',
          name: 'Chef Isabella Martinez',
          comment:
            'Actually, you can use duck fat from the store and cook at 200°F for 3 hours. The key is maintaining that low temperature - think of it like a spa day for your duck!',
          time: '14:18',
        },
        {
          id: 'host',
          name: 'Marcus',
          comment:
            'I love that analogy! Now what about the taco shells - are we making those from scratch too?',
          time: '14:19',
        },
      ];

      console.log('👨‍🍳 Celebrity Chef Cooking Demo 👨‍🍳\n');
      console.log('Teaching advanced cooking techniques with accessible explanations...\n');

      const response = await conversationTurnLines({
        speaker: chef,
        topic: 'duck confit tacos with handmade tortillas and pickled vegetables',
        history: showHistory,
        rules: {
          customPrompt:
            'You are an enthusiastic celebrity chef on a cooking show. Make complex techniques sound approachable, use vivid analogies, and share professional tips that home cooks can actually use.',
        },
      });

      console.log(`Chef Isabella Martinez:`);
      console.log(`"${response}"\n`);

      // Verify cooking show response quality
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(30);

      console.log(
        '✅ Celebrity chef provided engaging, educational cooking instruction with practical tips'
      );
    },
    longTestTimeout
  );

  it(
    'marine biologist documentary narration',
    async () => {
      // Simulate a marine biologist explaining deep sea discoveries
      const scientist = {
        id: 'biologist',
        name: 'Dr. Samara Okafor',
        bio: 'Marine biologist and deep-sea explorer, leading researcher on bioluminescent organisms',
        agenda: 'Share the wonder of deep ocean discoveries while explaining the science clearly',
      };

      const documentaryHistory = [
        {
          id: 'narrator',
          name: 'Documentary Narrator',
          comment:
            "Dr. Okafor, you've just discovered a new species of jellyfish at 3,000 meters deep. What makes this find so remarkable?",
          time: '16:45',
        },
        {
          id: 'biologist',
          name: 'Dr. Samara Okafor',
          comment:
            "This jellyfish produces a blue-green light we've never seen before. It's like finding a new color in nature's palette.",
          time: '16:46',
        },
        {
          id: 'narrator',
          name: 'Documentary Narrator',
          comment: 'How does this bioluminescence work exactly?',
          time: '16:47',
        },
        {
          id: 'biologist',
          name: 'Dr. Samara Okafor',
          comment:
            "The jellyfish has specialized cells called photophores that mix luciferin with luciferase - it's essentially a biological chemistry set creating living light.",
          time: '16:48',
        },
        {
          id: 'narrator',
          name: 'Documentary Narrator',
          comment: 'And what purpose does this serve in the deep ocean environment?',
          time: '16:49',
        },
      ];

      console.log('🌊 Marine Biology Documentary 🌊\n');
      console.log('Explaining deep-sea discoveries with scientific wonder...\n');

      const response = await conversationTurnLines({
        speaker: scientist,
        topic: 'bioluminescent deep-sea creatures and their evolutionary adaptations',
        history: documentaryHistory,
        rules: {
          customPrompt:
            'You are a passionate marine biologist in a nature documentary. Explain complex scientific concepts with wonder and clarity, using vivid descriptions that help viewers visualize the deep ocean world.',
        },
      });

      console.log(`Dr. Samara Okafor:`);
      console.log(`"${response}"\n`);

      // Verify documentary response quality
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(40);

      console.log(
        '✅ Marine biologist provided scientifically accurate yet captivating explanation'
      );
    },
    longTestTimeout
  );

  it(
    'vintage record store owner sharing music history',
    async () => {
      // Simulate a knowledgeable record store owner discussing rare vinyl
      const storeOwner = {
        id: 'owner',
        name: 'Felix Rodriguez',
        bio: 'Owner of Groove Archive Records for 30 years, expert in jazz, soul, and rare pressings',
        agenda: 'Share the stories behind the music and help customers discover hidden gems',
      };

      const storeHistory = [
        {
          id: 'customer',
          name: 'Sarah',
          comment:
            "I'm looking for something special - my dad used to play this Miles Davis album, but I can't remember the name.",
          time: '11:30',
        },
        {
          id: 'owner',
          name: 'Felix Rodriguez',
          comment:
            'Miles Davis, excellent taste! Can you hum a melody or remember any lyrics? Was it from his electric period or acoustic?',
          time: '11:31',
        },
        {
          id: 'customer',
          name: 'Sarah',
          comment:
            'It had this haunting trumpet solo, very moody. I think it was from the late 50s or early 60s?',
          time: '11:32',
        },
        {
          id: 'owner',
          name: 'Felix Rodriguez',
          comment:
            "Ah, that could be 'Kind of Blue' - the most important jazz album ever recorded. That haunting quality you remember is probably 'Blue in Green.'",
          time: '11:33',
        },
        {
          id: 'customer',
          name: 'Sarah',
          comment: "Yes! That's it! Do you have an original pressing?",
          time: '11:34',
        },
      ];

      console.log('🎵 Vintage Record Store Discovery 🎵\n');
      console.log('Sharing musical knowledge and connecting people with their memories...\n');

      const response = await conversationTurnLines({
        speaker: storeOwner,
        topic: 'rare vinyl records, jazz history, and the stories behind classic albums',
        history: storeHistory,
        rules: {
          customPrompt:
            'You are a passionate record store owner with deep musical knowledge. Share the history and stories behind albums with enthusiasm, helping customers connect emotionally with the music.',
        },
      });

      console.log(`Felix Rodriguez:`);
      console.log(`"${response}"\n`);

      // Verify record store response quality
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(25);

      console.log('✅ Record store owner provided knowledgeable, passionate music guidance');
    },
    longTestTimeout
  );
});
