export interface User {
  id: number;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
}

export interface Post {
  id: number;
  author: User;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  image?: string;
  isLiked?: boolean;
}

export interface Workout {
  id: number;
  name: string;
  duration: number;
  calories: number;
  type: string;
  date: string;
  completed: boolean;
}

export interface FitnessStats {
  totalWorkouts: number;
  totalCalories: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

export type RootStackParamList = {
  Feed: undefined;
  CreatePost: undefined;
  Fitness: undefined;
};
