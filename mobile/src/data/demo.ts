import type { GearProfile } from "../types";

export const defaultGear: GearProfile = {
  camera: "Sony a6700",
  cameraSpecs: "4K 10-bit 4:2:2, S-Log3, HLG",
  lensA: "Meike 33mm f/1.4",
  lensASpecs: "≈50mm equiv, zero breathing",
  lensB: "Meike 55mm f/1.4",
  lensBSpecs: "≈82mm equiv, portrait lens",
  secondary: "Find X9",
  secondaryEnabled: true,
};

export const sampleScriptment = {
  id: "demo-1",
  title: "The Last Fisherman of Male",
  createdAt: "2026-06-18",
  acts: [
    {
      actNumber: 1,
      title: "The Quiet Before Dawn",
      beats: [
        {
          beatNumber: 1,
          description: "Wide establishing shot of the harbor at blue hour. The sleeping city in the distance, water perfectly still.",
          motivation: "Sets the scene and time. Creates anticipation.",
          shotType: "Establishing",
          emotionalTone: "Contemplative",
          recommendedLens: "33mm",
          cameraSettings: {
            lens: "Meike 33mm f/1.4",
            aperture: "f/8",
            shutter: "1/48s",
            iso: "400",
            whiteBalance: "3200K",
            pictureProfile: "S-Log3",
            composition: "Horizon on upper third",
            notes: "Arrive 30 min before sunrise.",
          },
        },
        {
          beatNumber: 2,
          description: "Medium shot of weathered hands coiling a rope on the boat deck.",
          motivation: "Introduces character through action, not face.",
          shotType: "Medium",
          emotionalTone: "Intimate",
          recommendedLens: "33mm",
          cameraSettings: {
            lens: "Meike 33mm f/1.4",
            aperture: "f/2.8",
            shutter: "1/48s",
            iso: "200",
            whiteBalance: "5600K",
            pictureProfile: "S-Log3",
            composition: "Hands on left third",
            notes: "Shoot from slightly above.",
          },
        },
      ],
    },
    {
      actNumber: 2,
      title: "The Ritual",
      beats: [
        {
          beatNumber: 3,
          description: "Close-up profile of the fisherman looking toward the horizon. First rays of sun hit his face.",
          motivation: "The emotional core. A face that carries the weight of a simple life.",
          shotType: "Close-up",
          emotionalTone: "Hopeful",
          recommendedLens: "55mm",
          cameraSettings: {
            lens: "Meike 55mm f/1.4",
            aperture: "f/1.4",
            shutter: "1/48s",
            iso: "100",
            whiteBalance: "5600K",
            pictureProfile: "HLG",
            composition: "Face fills right two-thirds",
            notes: "Expose for the face.",
          },
        },
        {
          beatNumber: 4,
          description: "Extreme wide aerial shot of the small wooden boat on vast turquoise ocean.",
          motivation: "Our character against the infinite.",
          shotType: "Aerial",
          emotionalTone: "Awe",
          recommendedLens: "Find X9",
          cameraSettings: {
            lens: "Find X9 (wide mode)",
            aperture: "f/2.2",
            shutter: "1/50s",
            iso: "100",
            whiteBalance: "5600K",
            pictureProfile: "Standard",
            composition: "Boat centered",
            notes: "Use drone or high vantage point.",
          },
        },
      ],
    },
    {
      actNumber: 3,
      title: "Horizon",
      beats: [
        {
          beatNumber: 5,
          description: "Low angle looking up at boat mast and ropes against a dramatic orange sunrise sky.",
          motivation: "The transcendence shot. The film's visual climax.",
          shotType: "Wide",
          emotionalTone: "Transcendent",
          recommendedLens: "33mm",
          cameraSettings: {
            lens: "Meike 33mm f/1.4",
            aperture: "f/5.6",
            shutter: "1/48s",
            iso: "100",
            whiteBalance: "5600K",
            pictureProfile: "S-Log3",
            composition: "Mast creates vertical line",
            notes: "Shoot directly into sun.",
          },
        },
      ],
    },
  ],
};

export const samplePrompts = [
  "Golden hour portrait at the harbor",
  "Night market in the rain",
  "Morning routine — cinematic montage",
  "The last fisherman of the island",
];
