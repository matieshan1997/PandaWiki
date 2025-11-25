import { useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { ConversationItem } from '../types';
import { ChunkResultItem } from '@/assets/type';

export const useConversation = () => {
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [fullAnswer, setFullAnswer] = useState<string>('');
  const [chunkResult, setChunkResult] = useState<ChunkResultItem[]>([]);
  const [thinkingContent, setThinkingContent] = useState<string>('');
  const [answer, setAnswer] = useState('');
  const [isChunkResult, setIsChunkResult] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const messageIdRef = useRef('');

  const addQuestion = useCallback(
    (q: string, reset: boolean = false) => {
      const newConversation = reset
        ? []
        : conversation.some(item => item.source === 'history')
          ? []
          : [...conversation];

      newConversation.push({
        q,
        a: '',
        score: 0,
        message_id: '',
        update_time: '',
        source: 'chat',
        chunk_result: [],
        thinking_content: '',
      });

      messageIdRef.current = '';
      setConversation(newConversation);
      setChunkResult([]);
      setThinkingContent('');
      setAnswer('');
      setFullAnswer('');
    },
    [conversation],
  );

  const updateLastConversation = useCallback(() => {
    setAnswer(prevAnswer => {
      setThinkingContent(prevThinkingContent => {
        setChunkResult(prevChunkResult => {
          setConversation(prev => {
            const newConversation = [...prev];
            const lastConversation =
              newConversation[newConversation.length - 1];
            if (lastConversation) {
              lastConversation.a = prevAnswer;
              lastConversation.update_time = dayjs().format(
                'YYYY-MM-DD HH:mm:ss',
              );
              lastConversation.message_id = messageIdRef.current;
              lastConversation.source = 'chat';
              lastConversation.chunk_result = prevChunkResult;
              lastConversation.thinking_content = prevThinkingContent;
            }
            return newConversation;
          });
          return prevChunkResult;
        });
        return prevThinkingContent;
      });
      return '';
    });

    setFullAnswer('');
  }, []);

  const updateConversationScore = useCallback(
    (message_id: string, score: number) => {
      setConversation(prev =>
        prev.map(item =>
          item.message_id === message_id ? { ...item, score } : item,
        ),
      );
    },
    [],
  );

  const resetConversation = useCallback(() => {
    setConversation([]);
    setChunkResult([]);
    setAnswer('');
    setFullAnswer('');
    setThinkingContent('');
    messageIdRef.current = '';
  }, []);

  return {
    conversation,
    setConversation,
    fullAnswer,
    setFullAnswer,
    chunkResult,
    setChunkResult,
    thinkingContent,
    setThinkingContent,
    answer,
    setAnswer,
    isChunkResult,
    setIsChunkResult,
    isThinking,
    setIsThinking,
    messageIdRef,
    addQuestion,
    updateLastConversation,
    updateConversationScore,
    resetConversation,
  };
};
