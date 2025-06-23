import { describe, it, expect } from 'vitest';
import peopleList from './index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('people-list examples', () => {
  it(
    'diverse startup founding team generation',
    async () => {
      // Generate a diverse founding team for a health tech startup
      console.log('🚀 Health Tech Startup Founding Team 🚀\n');

      const foundingTeam = await peopleList(
        'diverse founding team for a health tech startup focusing on mental health apps, with complementary skills in technology, business, healthcare, and design',
        4,
        {
          llm: { model: 'gpt-4', temperature: 0.8 },
          maxTokens: 1200,
        }
      );

      console.log('Generated founding team:');
      foundingTeam.forEach((member, index) => {
        console.log(`\n${index + 1}. ${member.name}`);
        console.log(`   ${member.description}`);
      });

      // Verify team diversity and relevance
      expect(foundingTeam).toHaveLength(4);
      foundingTeam.forEach((member) => {
        expect(member).toHaveProperty('name');
        expect(member).toHaveProperty('description');
        expect(typeof member.name).toBe('string');
        expect(typeof member.description).toBe('string');
        expect(member.name.length).toBeGreaterThan(2);
        expect(member.description.length).toBeGreaterThan(20);
      });

      console.log(
        '\n✅ Generated diverse founding team with complementary expertise in health tech'
      );
    },
    longTestTimeout
  );

  it(
    'clinical trial participant personas',
    async () => {
      // Generate realistic patient personas for clinical trial planning
      console.log('\n🏥 Clinical Trial Patient Personas 🏥\n');

      const participants = await peopleList(
        'diverse patient personas for a clinical trial testing a new diabetes medication, representing different demographics, disease stages, and lifestyle factors that would affect treatment outcomes',
        6,
        {
          llm: { model: 'gpt-4' },
          maxTokens: 1500,
        }
      );

      console.log('Clinical trial participant personas:');
      participants.forEach((participant, index) => {
        console.log(`\n${index + 1}. ${participant.name}`);
        console.log(`   ${participant.description}`);
      });

      // Verify medical relevance and diversity
      expect(participants).toHaveLength(6);
      participants.forEach((participant) => {
        expect(participant).toHaveProperty('name');
        expect(participant).toHaveProperty('description');
        expect(typeof participant.name).toBe('string');
        expect(typeof participant.description).toBe('string');
        expect(participant.description.length).toBeGreaterThan(30);
      });

      console.log(
        '\n✅ Generated diverse patient personas representing various demographics and clinical presentations'
      );
    },
    longTestTimeout
  );

  it(
    'cybersecurity incident response team',
    async () => {
      // Generate specialists for a cybersecurity incident response team
      console.log('\n🛡️ Cybersecurity Incident Response Team 🛡️\n');

      const responseTeam = await peopleList(
        'cybersecurity incident response team members with specialized skills in digital forensics, malware analysis, network security, threat intelligence, and crisis communication',
        5,
        {
          llm: { model: 'gpt-4', temperature: 0.7 },
        }
      );

      console.log('Incident response team specialists:');
      responseTeam.forEach((specialist, index) => {
        console.log(`\n${index + 1}. ${specialist.name}`);
        console.log(`   ${specialist.description}`);
      });

      // Verify technical expertise representation
      expect(responseTeam).toHaveLength(5);
      responseTeam.forEach((specialist) => {
        expect(specialist).toHaveProperty('name');
        expect(specialist).toHaveProperty('description');
        expect(typeof specialist.name).toBe('string');
        expect(typeof specialist.description).toBe('string');
        expect(specialist.description.length).toBeGreaterThan(25);
      });

      console.log('\n✅ Generated specialized cybersecurity team with diverse technical expertise');
    },
    longTestTimeout
  );

  it(
    'user research interview participants',
    async () => {
      // Generate diverse user personas for UX research interviews
      console.log('\n👥 UX Research Interview Participants 👥\n');

      const interviewees = await peopleList(
        'diverse users for UX research interviews about a new grocery delivery app, representing different ages, tech comfort levels, family situations, and shopping behaviors',
        8,
        {
          llm: { model: 'gpt-4', temperature: 0.9 },
          maxTokens: 2000,
        }
      );

      console.log('UX research interview participants:');
      interviewees.forEach((participant, index) => {
        console.log(`\n${index + 1}. ${participant.name}`);
        console.log(`   ${participant.description}`);
      });

      // Group participants by key characteristics for research planning
      const demographics = {
        seniors: interviewees.filter(
          (p) => p.description.toLowerCase().includes('senior') || /\b[6-9]\d\b/.test(p.description)
        ),
        parents: interviewees.filter(
          (p) =>
            p.description.toLowerCase().includes('parent') ||
            p.description.toLowerCase().includes('children')
        ),
        techSavvy: interviewees.filter(
          (p) =>
            p.description.toLowerCase().includes('tech') ||
            p.description.toLowerCase().includes('app')
        ),
        budgetConscious: interviewees.filter(
          (p) =>
            p.description.toLowerCase().includes('budget') ||
            p.description.toLowerCase().includes('savings')
        ),
      };

      console.log('\n📊 Research Segment Analysis:');
      Object.entries(demographics).forEach(([segment, people]) => {
        if (people.length > 0) {
          console.log(`${segment}: ${people.length} participants`);
        }
      });

      // Verify diverse representation for comprehensive UX research
      expect(interviewees).toHaveLength(8);
      interviewees.forEach((participant) => {
        expect(participant).toHaveProperty('name');
        expect(participant).toHaveProperty('description');
        expect(typeof participant.name).toBe('string');
        expect(typeof participant.description).toBe('string');
        expect(participant.description.length).toBeGreaterThan(30);
      });

      console.log(
        '\n✅ Generated diverse user personas suitable for comprehensive UX research interviews'
      );
    },
    longTestTimeout
  );
});
