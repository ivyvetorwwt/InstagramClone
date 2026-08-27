# Instagram Clone - Overall Architecture

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture Components](#architecture-components)
5. [Data Flow](#data-flow)
6. [Security Model](#security-model)
7. [Key Features](#key-features)

## Overview

This Instagram Clone is a full-stack social media application that replicates core Instagram functionality. The application consists of three main components:
- **Frontend Mobile App**: React Native mobile application built with Expo
- **Backend**: Firebase Cloud Functions for serverless backend logic
- **Admin Panel**: ReactJS web application for administrative tasks

## Technology Stack

### Frontend (Mobile App)
- **Framework**: React Native with Expo SDK 42
- **Navigation**: React Navigation v5 (Stack, Bottom Tabs, Material Tabs)
- **State Management**: Redux with Redux Thunk middleware
- **UI Components**: 
  - React Native Elements
  - React Native Paper
  - Custom styled components
- **Media Handling**:
  - Expo Camera
  - Expo Image Picker
  - Expo Video Player
  - Expo Media Library
- **Real-time Features**: Firebase Firestore listeners
- **Notifications**: Expo Notifications with push notification support

### Backend
- **Platform**: Firebase
  - **Authentication**: Firebase Auth
  - **Database**: Cloud Firestore (NoSQL)
  - **Storage**: Firebase Storage (for images/videos)
  - **Functions**: Firebase Cloud Functions (Node.js)
- **Serverless Architecture**: Event-driven functions triggered by Firestore changes

### Admin Panel
- **Framework**: ReactJS 17
- **UI Library**: Material-UI
- **Data Grid**: Material-UI Data Grid
- **Routing**: React Router DOM
- **Icons**: React Icons

## Project Structure

```
InstagramClone/
├── frontend/                    # React Native mobile application
│   ├── App.js                  # Main application entry point
│   ├── components/             # React components
│   │   ├── auth/              # Authentication screens (Login, Register)
│   │   ├── main/              # Main app screens
│   │   │   ├── add/           # Post creation functionality
│   │   │   ├── chat/          # Chat/messaging features
│   │   │   ├── post/          # Post viewing and comments
│   │   │   ├── profile/       # User profile screens
│   │   │   └── random/        # Utility screens (Blocked users, etc.)
│   │   ├── Main.js            # Main navigation container
│   │   ├── styles.js          # Global styles
│   │   └── utils.js           # Utility functions
│   ├── redux/                 # State management
│   │   ├── actions/           # Redux actions
│   │   ├── constants/         # Action type constants
│   │   └── reducers/          # Redux reducers
│   └── assets/                # Images, fonts, and static resources
│
├── backend/                    # Firebase Cloud Functions
│   └── functions/
│       └── index.js           # Cloud function definitions
│
├── admin/                      # ReactJS admin panel
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── config/            # Configuration files
│   │   └── App.js             # Admin app entry point
│   └── public/                # Static assets
│
├── firestore_rules.txt        # Firestore security rules
└── storage_rules.txt          # Firebase Storage security rules
```

## Architecture Components

### 1. Mobile Application (Frontend)

#### Authentication Flow
- **Entry Point**: `App.js` manages authentication state
- **Auth Screens**: Login and Register components
- **Firebase Auth**: Handles user authentication with email/password
- **State Persistence**: Firebase `onAuthStateChanged` listener maintains session

#### Navigation Structure
```
NavigationContainer
└── Stack Navigator
    ├── Auth Stack (Unauthenticated)
    │   ├── Login Screen
    │   └── Register Screen
    └── Main Stack (Authenticated)
        ├── Main Screen (Bottom Tabs)
        │   ├── Feed Tab
        │   ├── Search Tab
        │   ├── Camera Tab
        │   ├── Chat Tab
        │   └── Profile Tab
        ├── Save Screen (Post creation)
        ├── Post Screen (Post details)
        ├── Comment Screen
        ├── Chat Screen (Individual chat)
        ├── ChatList Screen
        ├── Edit Profile Screen
        └── Profile Screen (User profiles)
```

#### State Management (Redux)

**Store Structure**:
```javascript
{
  currentUser: {
    uid: string,
    username: string,
    email: string,
    name: string,
    notificationToken: string,
    followersCount: number,
    followingCount: number
  },
  posts: Array,           // Current user's posts
  following: Array,       // UIDs of followed users
  chats: Array,          // User's chat conversations
  usersState: {
    users: Array,        // Cached user data
    posts: Array,        // Posts from followed users
    likes: Object        // Like status for posts
  }
}
```

**Key Actions**:
- `fetchUser()`: Loads current user data with real-time listener
- `fetchUserPosts()`: Retrieves user's posts
- `fetchUserFollowing()`: Gets list of followed users
- `fetchUsersData()`: Loads data for other users
- `fetchUsersFollowingPosts()`: Retrieves posts from followed users
- `fetchUserChats()`: Loads chat conversations
- `sendNotification()`: Sends push notifications
- `clearData()`: Cleans up listeners on logout

### 2. Backend (Firebase Cloud Functions)

#### Cloud Functions
Event-driven functions that automatically execute in response to Firestore changes:

**Like Management**:
- `addLike`: Increments `likesCount` when a like document is created
- `removeLike`: Decrements `likesCount` when a like document is deleted

**Follow Management**:
- `addFollower`: Updates `followersCount` and `followingCount` when following relationship is created
- `removeFollower`: Updates counts when following relationship is deleted

**Comment Management**:
- `addComment`: Increments `commentsCount` when a comment is added

### 3. Database Schema (Firestore)

```
users/
  {userId}/
    - username: string
    - email: string
    - name: string
    - notificationToken: string
    - followersCount: number
    - followingCount: number

posts/
  {userId}/
    userPosts/
      {postId}/
        - downloadURL: string (image/video URL)
        - caption: string
        - creation: timestamp
        - likesCount: number
        - commentsCount: number
        
        likes/
          {userId}/
            - creation: timestamp
        
        comments/
          {commentId}/
            - creator: string (userId)
            - text: string
            - creation: timestamp

following/
  {userId}/
    userFollowing/
      {followedUserId}/
        - creation: timestamp

chats/
  {chatId}/
    - users: array [userId1, userId2]
    - lastMessage: string
    - lastMessageTimestamp: timestamp
    
    messages/
      {messageId}/
        - text: string
        - creator: string (userId)
        - creation: timestamp

feed/
  {userId}/
    userFeed/
      {postId}/
        - (post data for user's feed)

admin/
  {userId}/
    - (admin user data)
```

## Data Flow

### Post Creation Flow
1. User captures/selects media using Camera or Image Picker
2. Media is uploaded to Firebase Storage
3. Post document is created in Firestore at `posts/{userId}/userPosts/{postId}`
4. Post appears in user's profile
5. Post is distributed to followers' feeds

### Like Flow
1. User taps like button on a post
2. Like document is created at `posts/{creatorId}/userPosts/{postId}/likes/{userId}`
3. Cloud Function `addLike` is triggered
4. `likesCount` is automatically incremented
5. Real-time listener updates UI

### Follow Flow
1. User follows another user
2. Following document is created at `following/{userId}/userFollowing/{followedUserId}`
3. Cloud Function `addFollower` is triggered
4. Both `followersCount` and `followingCount` are updated
5. Followed user's posts are fetched and added to feed

### Chat Flow
1. User initiates chat with another user
2. Chat document is created in `chats/` collection with both user IDs
3. Messages are added to `chats/{chatId}/messages/` subcollection
4. Real-time listeners update chat UI
5. Push notifications are sent to recipient

### Real-time Updates
- Firestore `onSnapshot` listeners provide real-time data synchronization
- Changes to posts, likes, comments, and chats are instantly reflected
- Listeners are managed through Redux actions and cleaned up on logout

## Security Model

### Firestore Security Rules

**User Data**:
- Read: Public (anyone can view user profiles)
- Write: Only the user themselves or admins

**Posts**:
- Read: Public (anyone can view posts)
- Write: Only the post creator or admins

**Likes**:
- Read: Public
- Write: Only the user who is liking (userId must match likeId)

**Comments**:
- Read: Public
- Write: Any authenticated user

**Following**:
- Read: Public
- Write: Only the user themselves (userId must match)

**Chats**:
- Read/Update: Only users who are part of the chat
- Write: Any authenticated user (to initiate chats)

**Admin Collection**:
- All operations: Denied (managed server-side only)

### Storage Rules
- Users can upload media to their own storage paths
- Public read access for viewing content

## Key Features

### Core Functionality
- ✅ User authentication (email/password)
- ✅ User profiles with follower/following counts
- ✅ Photo and video posting
- ✅ Feed with posts from followed users
- ✅ Like and unlike posts
- ✅ Comment on posts
- ✅ Follow/unfollow users
- ✅ User search
- ✅ Direct messaging (chat)
- ✅ Push notifications
- ✅ Profile editing
- ✅ Post deletion
- ✅ Blocked users management

### Technical Features
- Real-time data synchronization
- Optimistic UI updates
- Image and video upload with compression
- Infinite scroll for feeds
- Pull-to-refresh
- Skeleton loading states
- Error handling and retry logic
- Offline support (Firestore caching)

### Admin Panel Features
- User management
- Content moderation
- Analytics dashboard
- Admin authentication

## Performance Optimizations

1. **Data Caching**: Redux stores fetched user data to avoid redundant requests
2. **Lazy Loading**: Posts and users are loaded on-demand
3. **Image Optimization**: Images are compressed before upload
4. **Real-time Listeners**: Efficient use of Firestore listeners with proper cleanup
5. **Pagination**: Posts are loaded in batches
6. **Memoization**: React components use proper memoization techniques

## Scalability Considerations

1. **Serverless Architecture**: Firebase Cloud Functions scale automatically
2. **NoSQL Database**: Firestore scales horizontally
3. **CDN**: Firebase Storage provides global CDN for media
4. **Denormalization**: Data is denormalized for read performance (e.g., counts stored on documents)
5. **Indexed Queries**: Firestore indexes optimize query performance

## Development Workflow

1. **Frontend Development**: 
   - Run `expo start` in the frontend directory
   - Test on physical device or emulator
   - Hot reload for rapid development

2. **Backend Development**:
   - Deploy Cloud Functions with Firebase CLI
   - Test functions in Firebase Console
   - Monitor logs for debugging

3. **Admin Panel Development**:
   - Run `npm start` in admin directory
   - Develop in browser with hot reload
   - Build for production with `npm run build`

## Deployment

1. **Mobile App**: Published through Expo or built as standalone apps for iOS/Android
2. **Cloud Functions**: Deployed to Firebase using Firebase CLI
3. **Admin Panel**: Hosted on Firebase Hosting or other web hosting services
4. **Database Rules**: Deployed through Firebase Console or CLI

---

**Last Updated**: 2024
**Version**: 1.0
**Architecture Type**: Serverless, Event-Driven, Real-time
