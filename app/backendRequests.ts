/**
 * Fetches a single playlist by its ID.
 * @param {string} playlistId The ID of the playlist.
 * @returns {Promise<Playlist>} The playlist object.
 */
export async function fetchPlaylistByID(playlistId: string): Promise<Playlist> {
  return fetchData<Playlist>(`/api/mochlist/${playlistId}`);
}
/**
 * Updates details of a video by its ID.
 * @param {string} videoId The ID of the video to update.
 * @param {Partial<Video>} updates The updated video details.
 * @returns {Promise<Video>} The updated video object.
 */
export async function updateVideoDetails(videoId: string, updates: Partial<Video>): Promise<Video> {
  return fetchData<Video>(`/api/videos/${videoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
}
import fetchData from './fetchService';
import { Playlist, Video, VideoData } from './types';

/**
 * A service for interacting with the playlist and video API endpoints.
 * All functions use the centralized fetchData service.
 */

// PLAYLISTS

/**
 * Creates a new playlist with the given name.
 * @param {string} name The name of the new playlist.
 * @returns {Promise<Playlist>} The newly created playlist object.
 */
export async function createPlaylist(name: string): Promise<Playlist> {
  return fetchData<Playlist>('/api/mochlist/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
}

/**
 * Fetches all playlists for the currently authenticated user.
 * @returns {Promise<Playlist[]>} An array of playlist objects.
 */
export async function fetchPlaylistsByCurrUser(): Promise<Playlist[]> {
  return fetchData<Playlist[]>('/api/mochlist/');
}

/**
 * Edits an existing playlist.
 * @param {string} id The ID of the playlist to edit.
 * @param {Partial<Playlist>} updates The updates to apply to the playlist.
 * @returns {Promise<Playlist>} The updated playlist object.
 */
export async function editPlaylist(id: string, updates: Partial<Playlist>): Promise<Playlist> {
  return fetchData<Playlist>(`/api/mochlist/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
}

/**
 * Deletes a playlist.
 * @param {string} id The ID of the playlist to delete.
 * @returns {Promise<void>} The response from the delete operation.
 */
export async function deletePlaylist(id: string): Promise<void> {
  // Use a generic type or simply return the fetch response
  return fetchData<void>(`/api/mochlist/${id}`, {
    method: 'DELETE',
  });
}

// VIDEOS
/**
 * Fetches all videos in the database.
 * @returns {Promise<Video[]>} An array of video objects.
 */
export async function fetchAllVideos(): Promise<Video[]> {
  return fetchData<Video[]>('/api/videos');
}

/**
 * Adds a video to a specific playlist.
 * @param {string} playlistId The ID of the playlist to add the video to.
 * @param {VideoData} videoData The details of the video to add or link.
 * @returns {Promise<Video>} The newly created or linked video object.
 */
export async function addVideoToCurrPlaylist(
  playlistId: string,
  videoData: VideoData
): Promise<Video> {
  return fetchData<Video>(`/api/mochlist/${playlistId}/videos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(videoData),
  });
}

/**
 * Fetches a single video by its ID.
 * @param {string} videoId The ID of the video to fetch.
 * @returns {Promise<Video>} The video object.
 */
export async function fetchVideoByID(videoId: string): Promise<Video> {
  return fetchData<Video>(`/api/videos/${videoId}`);
}

/**
 * Fetches all videos within a specific playlist.
 * @param {string} playlistId The ID of the playlist.
 * @returns {Promise<Video[]>} An array of video objects.
 */
export async function fetchVideosByPlaylistID(playlistId: string): Promise<Video[]> {
  return fetchData<Video[]>(`/api/mochlist/${playlistId}/videos`);
}

/**
 * Deletes a video by its ID.
 * @param {string} videoId The ID of the video to delete.
 * @returns {Promise<void>} The response from the delete operation.
 */
export async function deleteVideo(videoId: string): Promise<void> {
  return fetchData<void>(`/api/videos/${videoId}`, {
    method: 'DELETE',
    body: JSON.stringify({ id: videoId })
  });
}

export const fetchAllVideosByCurrUser = async () => {
  const response = await fetch('/api/videos');
  if (!response.ok) {
    throw new Error('Failed to fetch user videos.');
  }
  return response.json();
};
