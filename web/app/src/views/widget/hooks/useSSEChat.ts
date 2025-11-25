import SSEClient from '@/utils/fetch';
import { message } from '@ctzhian/ui';
import dayjs from 'dayjs';
import { useCallback, useRef } from 'react';
import { AnswerStatusType, CAP_CONFIG, SSE_CONFIG } from '../constants';
import { ChatRequestData, SSEMessageData } from '../types';
import { handleThinkingContent } from '../utils';

interface UseSSEChatProps {
  conversationId: string;
  setConversationId: React.Dispatch<React.SetStateAction<string>>;
  nonce: string;
  setNonce: React.Dispatch<React.SetStateAction<string>>;
  messageIdRef: React.MutableRefObject<string>;
  setFullAnswer: React.Dispatch<React.SetStateAction<string>>;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  setThinkingContent: React.Dispatch<React.SetStateAction<string>>;
  setChunkResult: React.Dispatch<React.SetStateAction<any[]>>;
  setConversation: React.Dispatch<React.SetStateAction<any[]>>;
  setIsChunkResult: (value: boolean) => void;
  setIsThinking: (value: boolean) => void;
  setThinking: (value: AnswerStatusType) => void;
  setLoading: (value: boolean) => void;
  scrollToBottom: () => void;
}

export const useSSEChat = ({
  conversationId,
  setConversationId,
  nonce,
  setNonce,
  messageIdRef,
  setFullAnswer,
  setAnswer,
  setThinkingContent,
  setChunkResult,
  setConversation,
  setIsChunkResult,
  setIsThinking,
  setThinking,
  setLoading,
  scrollToBottom,
}: UseSSEChatProps) => {
  const sseClientRef = useRef<SSEClient<SSEMessageData> | null>(null);

  const initializeSSE = useCallback(() => {
    sseClientRef.current = new SSEClient({
      url: SSE_CONFIG.url,
      headers: SSE_CONFIG.headers,
      onCancel: () => {
        setLoading(false);
        setThinking(4);
        setAnswer(prev => {
          let value = '';
          if (prev) {
            value = prev + '\n\n<error>Request canceled</error>';
          }
          setConversation(prev => {
            const newConversation = [...prev];
            if (newConversation[newConversation.length - 1]) {
              newConversation[newConversation.length - 1].a = value;
              newConversation[newConversation.length - 1].update_time =
                dayjs().format('YYYY-MM-DD HH:mm:ss');
              newConversation[newConversation.length - 1].message_id =
                messageIdRef.current;
            }
            return newConversation;
          });
          return '';
        });
      },
    });
  }, [messageIdRef, setAnswer, setConversation, setLoading, setThinking]);

  const chatAnswer = useCallback(
    async (q: string) => {
      setLoading(true);
      setThinking(1);

      let token = '';
      try {
        const Cap = (await import('@cap.js/widget')).default;
        const cap = new Cap({ apiEndpoint: CAP_CONFIG.apiEndpoint });
        const solution = await cap.solve();
        token = solution.token;
      } catch (error) {
        message.error('验证失败');
        console.error('Captcha error:', error);
        setLoading(false);
        return;
      }

      const reqData: ChatRequestData = {
        message: q,
        nonce: nonce || '',
        conversation_id: conversationId || '',
        app_type: 1,
        captcha_token: token,
      };

      if (sseClientRef.current) {
        sseClientRef.current.subscribe(
          JSON.stringify(reqData),
          ({ type, content, chunk_result }) => {
            if (type === 'conversation_id') {
              setConversationId(prev => prev + content);
            } else if (type === 'message_id') {
              messageIdRef.current += content;
            } else if (type === 'nonce') {
              setNonce(prev => prev + content);
            } else if (type === 'error') {
              setLoading(false);
              setIsChunkResult(false);
              setIsThinking(false);
              setThinking(4);
              setAnswer(prev => {
                if (content) {
                  return prev + `\n\n回答出现错误：<error>${content}</error>`;
                }
                return prev + '\n\n回答出现错误，请重试';
              });
              if (content) message.error(content);
            } else if (type === 'done') {
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
              setLoading(false);
              setIsChunkResult(false);
              setIsThinking(false);
              setThinking(4);
            } else if (type === 'data') {
              setIsChunkResult(false);
              setFullAnswer(prevFullAnswer => {
                const newFullAnswer = prevFullAnswer + content;
                const { thinkingContent, answerContent } =
                  handleThinkingContent(newFullAnswer);

                setThinkingContent(thinkingContent);
                setAnswer(answerContent);

                if (newFullAnswer.includes('</think>')) {
                  setIsThinking(false);
                  setThinking(3);
                } else if (newFullAnswer.includes('<think>')) {
                  setIsThinking(true);
                  setThinking(2);
                } else {
                  setThinking(3);
                }

                return newFullAnswer;
              });
            } else if (type === 'chunk_result') {
              setChunkResult(prev => [...prev, chunk_result]);
              setIsChunkResult(true);
              setTimeout(scrollToBottom, 200);
            }
          },
        );
      }
    },
    [
      conversationId,
      nonce,
      messageIdRef,
      setConversationId,
      setNonce,
      setLoading,
      setThinking,
      setAnswer,
      setFullAnswer,
      setThinkingContent,
      setChunkResult,
      setConversation,
      setIsChunkResult,
      setIsThinking,
      scrollToBottom,
    ],
  );

  const handleSearchAbort = useCallback(() => {
    sseClientRef.current?.unsubscribe();
    setLoading(false);
    setThinking(4);
  }, [setLoading, setThinking]);

  return {
    sseClientRef,
    initializeSSE,
    chatAnswer,
    handleSearchAbort,
  };
};
