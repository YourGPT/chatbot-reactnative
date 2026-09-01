import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {Post} from '../types';
import {fetchPosts, createPost as createPostService, toggleLikePost as toggleLikePostService} from '../services/postService';

interface PostContextType {
  posts: Post[];
  loading: boolean;
  refreshPosts: () => Promise<void>;
  createPost: (content: string, image?: string) => Promise<void>;
  toggleLike: (postId: number) => Promise<void>;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export const PostProvider = ({children}: {children: ReactNode}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await fetchPosts();
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const refreshPosts = async () => {
    await loadPosts();
  };

  const createPost = async (content: string, image?: string) => {
    try {
      const newPost = await createPostService(content, image);
      setPosts([newPost, ...posts]);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const toggleLike = async (postId: number) => {
    try {
      await toggleLikePostService(postId);
      setPosts(
        posts.map(post =>
          post.id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked ? post.likes - 1 : post.likes + 1,
              }
            : post,
        ),
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <PostContext.Provider
      value={{
        posts,
        loading,
        refreshPosts,
        createPost,
        toggleLike,
      }}>
      {children}
    </PostContext.Provider>
  );
};

export const usePosts = () => {
  const context = useContext(PostContext);
  if (!context) {
    throw new Error('usePosts must be used within a PostProvider');
  }
  return context;
};
