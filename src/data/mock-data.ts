
import { User, Post, Story, Comment, Message, Channel, Notification } from "../types";

export const currentUser: User = {
  id: "user-current",
  username: "currentuser",
  displayName: "Current User",
  bio: "This is your profile. Edit your bio to tell your story.",
  profilePicture: "/placeholder.svg",
  followers: 842,
  following: 267,
  posts: 24,
  isVerified: true
};

export const mockUsers: User[] = [
  {
    id: "user-1",
    username: "alex.design",
    displayName: "Alex Johnson",
    bio: "Photographer | Traveler | Coffee enthusiast",
    profilePicture: "/placeholder.svg",
    followers: 1542,
    following: 267,
    posts: 54,
    isVerified: true
  },
  {
    id: "user-2",
    username: "sophia_travels",
    displayName: "Sophia Williams",
    bio: "Travel blogger exploring the world one city at a time ✈️",
    profilePicture: "/placeholder.svg",
    followers: 10283,
    following: 342,
    posts: 137
  },
  {
    id: "user-3",
    username: "markdesigns",
    displayName: "Mark Wilson",
    bio: "UI/UX Designer. Creating beautiful interfaces.",
    profilePicture: "/placeholder.svg",
    followers: 5321,
    following: 412,
    posts: 86,
    isVerified: true
  },
  {
    id: "user-4",
    username: "emily.fitness",
    displayName: "Emily Clark",
    bio: "Fitness coach | Healthy lifestyle | Motivation",
    profilePicture: "/placeholder.svg",
    followers: 8762,
    following: 543,
    posts: 210
  },
  {
    id: "user-5",
    username: "tech_mike",
    displayName: "Mike Roberts",
    bio: "Tech enthusiast. Always exploring the latest gadgets.",
    profilePicture: "/placeholder.svg",
    followers: 3241,
    following: 512,
    posts: 47
  }
];

export const mockPosts: Post[] = [
  {
    id: "post-1",
    userId: "user-1",
    user: mockUsers[0],
    imageUrl: "/placeholder.svg",
    caption: "Beautiful sunset at the beach today. Nature never fails to amaze me. #sunset #beach #nature",
    likes: 342,
    comments: 24,
    timestamp: "2023-05-01T18:25:43.511Z",
    isLiked: false,
    isSaved: false
  },
  {
    id: "post-2",
    userId: "user-2",
    user: mockUsers[1],
    imageUrl: "/placeholder.svg",
    caption: "Exploring the beautiful streets of Paris. The architecture here is breathtaking! #paris #travel #architecture",
    likes: 892,
    comments: 56,
    timestamp: "2023-05-01T14:15:23.511Z",
    isLiked: true,
    isSaved: true
  },
  {
    id: "post-3",
    userId: "user-3",
    user: mockUsers[2],
    imageUrl: "/placeholder.svg",
    caption: "Just finished this UI design for a new app. What do you think? #design #ui #creative",
    likes: 523,
    comments: 34,
    timestamp: "2023-04-30T09:45:13.511Z",
    isLiked: true,
    isSaved: false
  },
  {
    id: "post-4",
    userId: "user-4",
    user: mockUsers[3],
    imageUrl: "/placeholder.svg",
    caption: "Morning workout routine. Start your day with energy! #fitness #workout #motivation",
    likes: 721,
    comments: 42,
    timestamp: "2023-04-29T07:30:43.511Z",
    isLiked: false,
    isSaved: false
  },
  {
    id: "post-5",
    userId: "user-5",
    user: mockUsers[4],
    imageUrl: "/placeholder.svg",
    caption: "Just got my hands on the latest smartphone. The camera quality is incredible! #tech #gadgets #photography",
    likes: 432,
    comments: 28,
    timestamp: "2023-04-28T16:20:43.511Z",
    isLiked: false,
    isSaved: true
  },
  {
    id: "post-6",
    userId: "user-1",
    user: mockUsers[0],
    imageUrl: "/placeholder.svg",
    caption: "City lights at night. The perfect end to a perfect day. #cityscape #night #urban",
    likes: 678,
    comments: 45,
    timestamp: "2023-04-27T22:10:43.511Z",
    isLiked: true,
    isSaved: false
  }
];

export const mockStories: Story[] = mockUsers.map((user, index) => ({
  id: `story-${index + 1}`,
  userId: user.id,
  user,
  imageUrl: "/placeholder.svg",
  viewed: index > 2,
  timestamp: new Date(Date.now() - index * 3600000).toISOString()
}));

export const mockComments: Comment[] = [
  {
    id: "comment-1",
    userId: "user-2",
    user: mockUsers[1],
    postId: "post-1",
    text: "Absolutely stunning view! Where is this?",
    likes: 24,
    timestamp: "2023-05-01T18:45:43.511Z",
    isLiked: false
  },
  {
    id: "comment-2",
    userId: "user-3",
    user: mockUsers[2],
    postId: "post-1",
    text: "The colors in this photo are amazing!",
    likes: 12,
    timestamp: "2023-05-01T19:15:43.511Z",
    isLiked: true
  },
  {
    id: "comment-3",
    userId: "user-4",
    user: mockUsers[3],
    postId: "post-2",
    text: "Paris is on my bucket list! How long are you staying?",
    likes: 8,
    timestamp: "2023-05-01T15:25:43.511Z",
    isLiked: false
  }
];

export const mockMessages: Message[] = [
  {
    id: "message-1",
    senderId: "user-1",
    recipientId: "user-current",
    text: "Hey! How are you doing?",
    timestamp: "2023-05-01T18:30:43.511Z",
    read: true
  },
  {
    id: "message-2",
    senderId: "user-current",
    recipientId: "user-1",
    text: "I'm good, thanks! How about you?",
    timestamp: "2023-05-01T18:32:43.511Z",
    read: true
  },
  {
    id: "message-3",
    senderId: "user-1",
    recipientId: "user-current",
    text: "Doing great! Just wanted to share that I'll be in your city next week.",
    timestamp: "2023-05-01T18:35:43.511Z",
    read: true
  },
  {
    id: "message-4",
    senderId: "user-2",
    recipientId: "user-current",
    text: "Loved your recent post! Where was that taken?",
    timestamp: "2023-05-01T17:30:43.511Z",
    read: false
  }
];

export const mockChannels: Channel[] = [
  {
    id: "channel-1",
    name: "Photography Enthusiasts",
    description: "A channel for photography lovers to share tips, tricks, and their work.",
    imageUrl: "/placeholder.svg",
    ownerId: "user-1",
    members: 1243,
    isPrivate: false
  },
  {
    id: "channel-2",
    name: "Travel Adventures",
    description: "Share your travel experiences and discover new destinations.",
    imageUrl: "/placeholder.svg",
    ownerId: "user-2",
    members: 3567,
    isPrivate: false
  },
  {
    id: "channel-3",
    name: "UI/UX Designers",
    description: "Professional community for UI/UX designers to network and collaborate.",
    imageUrl: "/placeholder.svg",
    ownerId: "user-3",
    members: 892,
    isPrivate: true
  }
];

export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    userId: "user-current",
    type: "like",
    sourceUserId: "user-1",
    sourceUser: mockUsers[0],
    postId: "post-6",
    read: false,
    timestamp: "2023-05-01T19:25:43.511Z"
  },
  {
    id: "notif-2",
    userId: "user-current",
    type: "follow",
    sourceUserId: "user-3",
    sourceUser: mockUsers[2],
    read: false,
    timestamp: "2023-05-01T18:15:43.511Z"
  },
  {
    id: "notif-3",
    userId: "user-current",
    type: "comment",
    sourceUserId: "user-2",
    sourceUser: mockUsers[1],
    postId: "post-5",
    read: true,
    timestamp: "2023-05-01T16:45:43.511Z"
  },
  {
    id: "notif-4",
    userId: "user-current",
    type: "message",
    sourceUserId: "user-4",
    sourceUser: mockUsers[3],
    read: true,
    timestamp: "2023-05-01T15:30:43.511Z"
  }
];
