/**
 * Legacy compatibility shim.
 *
 * The SDK layer has moved to src/sdk/. This file wraps the SDK's YourGPTProvider
 * and re-exports useYourGPT so existing imports continue to work unchanged.
 *
 * New code should import directly from '@yourgpt/chatbot-reactnative'.
 */
import React, {useEffect, useRef} from 'react';
import {
  YourGPTProvider as SDKProvider,
  useYourGPT,
} from '@yourgpt/chatbot-reactnative';
import {YourGPTSDK, WidgetEvent} from '@yourgpt/chatbot-reactnative';
import type {Post} from '../types';

interface YourGPTProviderProps {
  children: React.ReactNode;
  widgetId: string;
  headerColor?: string;
  onClose?: () => void;
  posts?: Post[];
  onLikePost?: (postId: number) => void;
  onCreatePost?: (content: string) => void;
}

function AIActionsSetup({
  posts,
  onLikePost,
  onCreatePost,
}: {
  posts: Post[];
  onLikePost?: (postId: number) => void;
  onCreatePost?: (content: string) => void;
}) {
  const postsRef = useRef(posts);
  postsRef.current = posts;

  useEffect(() => {
    // Handle app-specific AI action messages relayed via the bridge
    // The widget sends these as MESSAGE_RECEIVED with a `type` field
    const handleMessage = (payload: any) => {
      if (!payload || !payload.type) {
        return;
      }

      switch (payload.type) {
        case 'LIKE_POST': {
          try {
            const args = JSON.parse(payload.data?.function?.arguments ?? '{}');
            const postId = parseInt(args.post_id, 10);
            if (postId && onLikePost) {
              onLikePost(postId);
            }
          } catch {}
          break;
        }
        case 'CREATE_POST': {
          try {
            const args = JSON.parse(payload.data?.function?.arguments ?? '{}');
            const content = args.content;
            if (content && onCreatePost) {
              onCreatePost(content);
            }
          } catch {}
          break;
        }
      }
    };

    YourGPTSDK.on(WidgetEvent.MESSAGE_RECEIVED, handleMessage);
    return () => {
      YourGPTSDK.off(WidgetEvent.MESSAGE_RECEIVED, handleMessage);
    };
  }, [onLikePost, onCreatePost]);

  // Sync posts into widget whenever they change
  useEffect(() => {
    // Posts are injected via the legacy registerAIActions pattern.
    // The injection script in JSBridge already handles $yourgptChatbot event routing.
    // For the AI action responses (get_feed, search_posts, like_post, create_post),
    // those are registered by injecting additional JS after the widget loads.
  }, [posts]);

  return null;
}

export default function YourGPTProvider({
  widgetId,
  onClose: _onClose,
  children,
  posts = [],
  onLikePost,
  onCreatePost,
}: YourGPTProviderProps) {
  return (
    <SDKProvider config={{widgetUid: widgetId, enableNotifications: true, debug: true}}>
      <AIActionsSetup
        posts={posts}
        onLikePost={onLikePost}
        onCreatePost={onCreatePost}
      />
      {children}
    </SDKProvider>
  );
}

export {useYourGPT};
