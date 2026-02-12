import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Article } from '../backend';

/**
 * Normalizes article content by removing excessive leading indentation
 * while preserving paragraph breaks and intended structure.
 */
function normalizeArticleContent(content: string): string {
  // Split into lines
  const lines = content.split('\n');
  
  // Find the minimum indentation among non-empty lines
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  if (nonEmptyLines.length === 0) return content.trim();
  
  const minIndent = Math.min(
    ...nonEmptyLines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    })
  );
  
  // Remove the common leading indentation from all lines
  const normalized = lines
    .map(line => {
      if (line.trim().length === 0) return ''; // Preserve blank lines
      return line.slice(minIndent);
    })
    .join('\n')
    .trim();
  
  return normalized;
}

/**
 * Validates that the article contains real content and not placeholder text.
 * Throws an error if placeholder content is detected.
 */
function validateArticleContent(article: Article): Article {
  // Normalize the content first
  const normalizedContent = normalizeArticleContent(article.content);
  
  const placeholderPatterns = [
    'This is a generated long-form educational article',
    'This is a placeholder article',
    'In a full implementation, this would contain',
    'Oops! No article found',
    'no information',
  ];

  // Check if content contains any placeholder patterns
  const hasPlaceholder = placeholderPatterns.some(pattern =>
    normalizedContent.toLowerCase().includes(pattern.toLowerCase()) || 
    article.title.toLowerCase().includes(pattern.toLowerCase())
  );

  if (hasPlaceholder) {
    throw new Error('Article generation returned placeholder content. The article content is not yet available.');
  }

  // Validate that content has substance (at least 200 characters and multiple sections)
  if (normalizedContent.length < 200) {
    throw new Error('Article content is too short. Please try again.');
  }

  // Check for at least 2 section markers (# at start of line after normalization)
  const sectionCount = (normalizedContent.match(/^#/gm) || []).length;
  if (sectionCount < 2) {
    throw new Error('Article content does not contain enough structured sections.');
  }

  // Return article with normalized content
  return {
    title: article.title.trim(),
    content: normalizedContent,
  };
}

export function useGenerateArticle(questionText: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Article>({
    queryKey: ['generateArticle', questionText],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      if (!questionText) throw new Error('Question text is required');
      
      const article = await actor.generateArticle(questionText);
      
      // Validate and normalize the returned article
      return validateArticleContent(article);
    },
    enabled: !!actor && !actorFetching && !!questionText,
    retry: 1,
    staleTime: Infinity, // Cache articles indefinitely during session
  });
}
