export interface CameraSettings {
  lens: string;
  aperture: string;
  shutter: string;
  iso: string;
  whiteBalance: string;
  pictureProfile: string;
  composition: string;
  notes: string;
}

export interface Beat {
  beatNumber: number;
  description: string;
  motivation: string;
  shotType: ShotType;
  emotionalTone: string;
  recommendedLens: LensType;
  storyboardFrame?: string;
  cameraSettings?: CameraSettings;
}

export interface Act {
  actNumber: number;
  title: string;
  beats: Beat[];
}

export interface Scriptment {
  id: string;
  title: string;
  createdAt: string;
  acts: Act[];
}

export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  scriptment: Scriptment;
  heroFrame: string;
  shotCount: number;
  completedShots: number;
}

export interface GearProfile {
  camera: string;
  cameraSpecs: string;
  lensA: string;
  lensASpecs: string;
  lensB: string;
  lensBSpecs: string;
  secondary: string;
  secondaryEnabled: boolean;
}

export type ShotType = 
  | "Establishing" 
  | "Wide" 
  | "Medium" 
  | "Close-up" 
  | "ECU" 
  | "POV" 
  | "Aerial";

export type LensType = "33mm" | "55mm" | "Find X9";

export type PageRoute = "/" | "/scriptment" | "/shoot-list" | "/archive" | "/settings" | "/gear" | "/scout";

// ─── Image Upload & Analysis ─────────────────────────────────────

export interface ExifInfo {
  camera_model: string;
  captured_at: string;
  gps_lat: number | null;
  gps_lng: number | null;
  orientation: number;
  iso: number | null;
  aperture: string;
  shutter_speed: string;
  focal_length: string;
}

export interface ScoutAnalysis {
  scene_description: string;
  lighting_conditions: string;
  dominant_colors: string[];
  mood: string;
  time_of_day: string;
  location_type: string;
  props_textures: string[];
  suggested_shot_types: string[];
  technical_notes: string;
  exif: ExifInfo;
  // Proposed location data
  proposed_keywords: string[];
  proposed_description: string;
  proposed_vibe: string;
  proposed_best_times: string[];
  proposed_textures: string[];
  proposed_anti_tourism_description: string;
  // GPS
  gps_lat: number | null;
  gps_lng: number | null;
  suggested_country: string;
  suggested_place_name: string;
}

export interface ScoutSavePayload {
  image_base64: string;
  country: string;
  place_name: string;
  description: string;
  keywords: string[];
  vibe: string;
  best_times: string[];
  textures: string[];
  anti_tourism_description: string;
  gps_lat: number | null;
  gps_lng: number | null;
  captured_at: string;
}

export type InputTab = "write" | "photo" | "both";
