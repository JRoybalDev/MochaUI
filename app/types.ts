/**
 * Interfaces to define the structure of data models.
 * This file centralizes type definitions for better organization.
 */

// This represents the structure of a User, which is needed for the Playlist model
export interface User {
  id: string;
  username: string;
}

export interface Playlist {
  id: string;
  name: string;
  videos: Video[]; // An array of full Video objects
  user: User; // The user object who owns the playlist
  userId: string; // The ID of the user who owns the playlist
}

export interface Video {
  id: string; // Prisma's unique identifier for the video record
  title: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  videoUrl: string;
  playlists?: Playlist[]; // Array of playlists the video belongs to
  uploading?: boolean; // UI-only property for upload state
}

// Corrected type for creating/linking videos in a many-to-many relationship
export type VideoData =
  // Type for creating a new video to be linked to a playlist
  | {
    title: string;
    width: number;
    height: number;
    thumbnailUrl: string;
    videoUrl: string;
  }
  // Type for linking an existing video to a playlist
  | { id: string };
