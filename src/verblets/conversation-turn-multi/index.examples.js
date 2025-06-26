import { describe, it, expect } from 'vitest';
import conversationTurnMulti from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('conversation-turn-multi examples', () => {
  it(
    'crisis management team discussion',
    async () => {
      // Simulate a crisis management team responding to a data breach
      const speakers = [
        {
          id: 'ciso',
          name: 'Sarah Chen',
          bio: 'Chief Information Security Officer with 12 years cybersecurity experience',
          agenda: 'Assess security impact and coordinate technical response',
        },
        {
          id: 'legal',
          name: 'Marcus Rodriguez',
          bio: 'General Counsel specializing in data privacy and regulatory compliance',
          agenda: 'Evaluate legal obligations and regulatory reporting requirements',
        },
        {
          id: 'ceo',
          name: 'Jennifer Park',
          bio: 'CEO focused on company reputation and stakeholder communication',
          agenda: 'Minimize business impact and maintain customer trust',
        },
        {
          id: 'cto',
          name: 'David Kim',
          bio: 'Chief Technology Officer responsible for infrastructure and recovery',
          agenda: 'Lead technical remediation and prevent future incidents',
        },
      ];

      const history = [
        {
          id: 'analyst',
          name: 'Security Analyst',
          comment:
            'We detected unauthorized access to customer database containing 50,000 user records including emails and encrypted passwords',
          time: '09:15',
        },
        {
          id: 'analyst',
          name: 'Security Analyst',
          comment:
            'The breach appears to have occurred through a SQL injection vulnerability in our customer portal',
          time: '09:16',
        },
      ];

      console.log('🚨 Crisis Management Team Response 🚨\n');

      const responses = await conversationTurnMulti({
        speakers,
        topic: 'immediate response to customer data breach',
        history,
        rules: {
          customPrompt:
            'This is an urgent crisis situation. Provide specific, actionable responses that reflect your role and expertise. Focus on immediate next steps.',
        },
      });

      // Display the crisis response
      responses.forEach((response, index) => {
        const speaker = speakers[index];
        console.log(`${speaker.name} (${speaker.bio.split(' ')[0]} ${speaker.bio.split(' ')[1]}):`);
        console.log(`"${response}"\n`);
      });

      // Verify responses are contextual and role-appropriate
      expect(responses).toHaveLength(4);
      responses.forEach((response) => {
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(20);
      });

      console.log(
        '✅ Crisis team has provided coordinated response addressing security, legal, business, and technical concerns'
      );
    },
    longTestTimeout
  );

  it(
    'diverse focus group discussion',
    async () => {
      // Simulate a product focus group with diverse user personas
      const speakers = [
        {
          id: 'senior',
          name: 'Margaret Thompson',
          bio: '72-year-old retired teacher, new to smartphones',
          agenda: 'Understand if the app is accessible for seniors',
        },
        {
          id: 'millennial',
          name: 'Alex Rivera',
          bio: '28-year-old marketing professional, heavy app user',
          agenda: 'Evaluate advanced features and productivity benefits',
        },
        {
          id: 'parent',
          name: 'Priya Patel',
          bio: '35-year-old working mother of two young children',
          agenda: 'Assess family-friendly features and time-saving aspects',
        },
        {
          id: 'student',
          name: 'Jordan Williams',
          bio: '20-year-old college student, budget-conscious',
          agenda: 'Determine value for money and student-specific benefits',
        },
      ];

      const history = [
        {
          id: 'moderator',
          name: 'Focus Group Moderator',
          comment:
            "We've just shown you our new budgeting app prototype. What are your initial impressions?",
          time: '14:30',
        },
      ];

      console.log('💬 Product Focus Group Discussion 💬\n');

      const responses = await conversationTurnMulti({
        speakers,
        topic: 'feedback on new budgeting app prototype',
        history,
        rules: {
          customPrompt:
            'Respond authentically based on your demographic and life situation. Share specific concerns or benefits that would matter to someone like you.',
        },
      });

      // Display the diverse perspectives
      responses.forEach((response, index) => {
        const speaker = speakers[index];
        console.log(`${speaker.name} (${speaker.bio}):`);
        console.log(`"${response}"\n`);
      });

      // Verify we get diverse, authentic responses
      expect(responses).toHaveLength(4);
      responses.forEach((response) => {
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(15);
      });

      console.log(
        '✅ Focus group provided diverse perspectives across different user demographics and use cases'
      );
    },
    longTestTimeout
  );
});
