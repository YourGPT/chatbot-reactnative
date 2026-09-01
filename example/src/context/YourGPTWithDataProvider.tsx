import React, {ReactNode} from 'react';
import {Alert} from 'react-native';
import YourGPTProvider from './YourGPTProvider';
import {usePosts} from './PostProvider';

interface YourGPTWithDataProviderProps {
  children: ReactNode;
  widgetId: string;
  onClose?: () => void;
}

/**
 * Wrapper component that connects YourGPTProvider with Post context
 * This ensures the chatbot has access to the latest posts data
 */
export const YourGPTWithDataProvider = ({
  children,
  widgetId,
  onClose,
}: YourGPTWithDataProviderProps) => {
  const {posts, toggleLike, createPost} = usePosts();

  const handleLikePost = (postId: number) => {
    toggleLike(postId);
    console.log('Liked post:', postId);
  };

  const handleCreatePost = async (content: string) => {
    try {
      await createPost(content);
      Alert.alert('Success', 'Your post has been created!');
      console.log('Post created:', content.substring(0, 50));
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  return (
    <YourGPTProvider
      widgetId={widgetId}
      onClose={onClose}
      posts={posts}
      onLikePost={handleLikePost}
      onCreatePost={handleCreatePost}>
      {children}
    </YourGPTProvider>
  );
};
