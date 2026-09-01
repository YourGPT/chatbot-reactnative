import {Post, User} from '../types';

// Mock users for the social media app
const mockUsers: User[] = [
  {
    id: 1,
    name: 'Sarah Johnson',
    username: '@sarahjdev',
    avatar: 'https://i.pravatar.cc/150?img=1',
    bio: 'Software Engineer | Tech Enthusiast',
  },
  {
    id: 2,
    name: 'Michael Chen',
    username: '@mchen',
    avatar: 'https://i.pravatar.cc/150?img=13',
    bio: 'Product Designer | UX/UI',
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    username: '@emilyrod',
    avatar: 'https://i.pravatar.cc/150?img=5',
    bio: 'Data Scientist | AI & ML',
  },
  {
    id: 4,
    name: 'David Kim',
    username: '@davidkim',
    avatar: 'https://i.pravatar.cc/150?img=12',
    bio: 'Startup Founder | Entrepreneur',
  },
  {
    id: 5,
    name: 'Jessica Martinez',
    username: '@jmartinez',
    avatar: 'https://i.pravatar.cc/150?img=9',
    bio: 'Marketing Manager | Content Creator',
  },
];

// Mock posts for the social media feed
const mockPosts: Post[] = [
  {
    id: 1,
    author: mockUsers[0],
    content:
      'Just shipped a new feature! Really excited about how we improved the user experience. Building in public is such a great way to learn. 🚀',
    timestamp: '2h ago',
    likes: 124,
    comments: 23,
    isLiked: false,
  },
  {
    id: 2,
    author: mockUsers[1],
    content:
      'Design tip: Always start with the user problem, not the solution. The best designs come from deep understanding of user needs.',
    timestamp: '4h ago',
    likes: 89,
    comments: 12,
    isLiked: true,
  },
  {
    id: 3,
    author: mockUsers[2],
    content:
      'Excited to share that our AI model achieved 95% accuracy on the test dataset! Months of hard work paying off. Thanks to the amazing team!',
    timestamp: '6h ago',
    likes: 256,
    comments: 45,
    image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
    isLiked: false,
  },
  {
    id: 4,
    author: mockUsers[3],
    content:
      'Lessons from Year 1 of my startup:\n1. Listen to users constantly\n2. Ship fast, iterate faster\n3. Team culture is everything\n4. Cash flow > revenue',
    timestamp: '8h ago',
    likes: 342,
    comments: 67,
    isLiked: false,
  },
  {
    id: 5,
    author: mockUsers[4],
    content:
      'Content marketing in 2025: Authenticity beats perfection. Share your real journey, not just the highlights.',
    timestamp: '1d ago',
    likes: 167,
    comments: 34,
    isLiked: true,
  },
  {
    id: 6,
    author: mockUsers[0],
    content:
      'Working on a challenging bug today. Reminder: Take breaks, stay hydrated, and rubber duck debugging actually works!',
    timestamp: '1d ago',
    likes: 201,
    comments: 28,
    isLiked: false,
  },
  {
    id: 7,
    author: mockUsers[2],
    content:
      'Just published a new blog post about machine learning best practices. Link in bio! Would love to hear your thoughts.',
    timestamp: '2d ago',
    likes: 145,
    comments: 19,
    isLiked: false,
  },
  {
    id: 8,
    author: mockUsers[3],
    content:
      'Grateful for the incredible support from our early adopters. You all are the reason we keep building!',
    timestamp: '2d ago',
    likes: 412,
    comments: 56,
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
    isLiked: true,
  },
];

export const fetchPosts = async (): Promise<Post[]> => {
  // Simulate API call delay
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockPosts);
    }, 500);
  });
};

export const createPost = async (
  content: string,
  image?: string,
): Promise<Post> => {
  // Simulate API call to create a new post
  return new Promise(resolve => {
    setTimeout(() => {
      const newPost: Post = {
        id: Date.now(),
        author: mockUsers[0], // Current user
        content,
        timestamp: 'Just now',
        likes: 0,
        comments: 0,
        image,
        isLiked: false,
      };
      resolve(newPost);
    }, 300);
  });
};

export const toggleLikePost = async (postId: number): Promise<void> => {
  // Simulate API call to like/unlike a post
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 200);
  });
};
