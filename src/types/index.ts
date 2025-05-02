
export interface User {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  profilePicture: string;
  followers: number;
  following: number;
  posts: number;
  isVerified?: boolean;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  isLiked: boolean;
  isSaved: boolean;
}

export interface Story {
  id: string;
  userId: string;
  user: User;
  imageUrl: string;
  viewed: boolean;
  timestamp: string;
}

export interface Comment {
  id: string;
  userId: string;
  user: User;
  postId: string;
  text: string;
  likes: number;
  timestamp: string;
  isLiked: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  ownerId: string;
  members: number;
  isPrivate: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'mention';
  sourceUserId: string;
  sourceUser: User;
  postId?: string;
  read: boolean;
  timestamp: string;
}
