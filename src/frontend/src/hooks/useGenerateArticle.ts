import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Article } from '../backend';

/**
 * Validates that the article contains real content and not placeholder text.
 * Throws an error if placeholder content is detected.
 */
function validateArticleContent(article: Article): Article {
  const placeholderPatterns = [
    'This is a generated long-form educational article',
    'This is a placeholder article',
    'In a full implementation, this would contain',
  ];

  // Check if content contains any placeholder patterns
  const hasPlaceholder = placeholderPatterns.some(pattern =>
    article.content.includes(pattern) || article.title.includes(pattern)
  );

  if (hasPlaceholder) {
    throw new Error('Article generation returned placeholder content. The article content is not yet available.');
  }

  // Validate that content has substance (at least 200 characters and multiple sections)
  if (article.content.length < 200) {
    throw new Error('Article content is too short. Please try again.');
  }

  // Check for at least 2 section markers (# or numbered sections)
  const sectionCount = (article.content.match(/\n\s*#/g) || []).length;
  if (sectionCount < 2) {
    throw new Error('Article content does not contain enough structured sections.');
  }

  return article;
}

export function useGenerateArticle(questionText: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Article>({
    queryKey: ['generateArticle', questionText],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      if (!questionText) throw new Error('Question text is required');
      
      const article = await actor.generateArticle(questionText);
      
      // Validate the returned article
      return validateArticleContent(article);
    },
    enabled: !!actor && !actorFetching && !!questionText,
    retry: 1,
    staleTime: Infinity, // Cache articles indefinitely during session
  });
}
