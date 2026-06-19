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

export type PageRoute = "/" | "/scriptment" | "/shoot-list" | "/archive" | "/settings" | "/gear";
