import { describe, it, expect } from 'vitest';
import blogPost from './blog-post.js';

describe('blogPost', () => {
  it('includes the provided text in a code block', () => {
    const text = 'AI is transforming software development';
    const result = blogPost(text);
    expect(result).toContain('```\nAI is transforming software development\n```');
  });

  it('asks for a blog post', () => {
    const result = blogPost('some content');
    expect(result).toContain('blog post');
  });

  it('includes style guidance', () => {
    const result = blogPost('content');
    expect(result).toContain('interesting');
    expect(result).toContain('engaging');
  });

  it('advises not to use all information', () => {
    const result = blogPost('lots of data');
    expect(result).toContain("Don't necessarily use all");
  });
});
