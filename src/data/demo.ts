import type { Scriptment, Project, GearProfile } from "@/types";

export const defaultGear: GearProfile = {
  camera: "Sony a6700",
  cameraSpecs: "4K 10-bit 4:2:2, S-Log3, HLG",
  lensA: "Meike 33mm f/1.4",
  lensASpecs: "\u224850mm equiv, zero breathing",
  lensB: "Meike 55mm f/1.4",
  lensBSpecs: "\u224882mm equiv, portrait lens",
  secondary: "Find X9",
  secondaryEnabled: true,
};

export const sampleScriptment: Scriptment = {
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
          motivation: "Sets the scene and time. Creates anticipation. Establishes the world before our character enters.",
          shotType: "Establishing",
          emotionalTone: "Contemplative",
          recommendedLens: "33mm",
          storyboardFrame: "/frame1.jpg",
          cameraSettings: {
            lens: "Meike 33mm f/1.4",
            aperture: "f/8",
            shutter: "1/48s",
            iso: "400",
            whiteBalance: "3200K",
            pictureProfile: "S-Log3",
            composition: "Rule of thirds \u2014 horizon on upper third, jetty leads from right",
            notes: "Arrive 30 min before sunrise. Use tripod for stability.",
          },
        },
        {
          beatNumber: 2,
          description: "Medium shot of weathered hands coiling a rope on the boat deck. Golden light just beginning to touch the water.",
          motivation: "Introduces our character through action, not face. The hands tell the story of a life at sea.",
          shotType: "Medium",
          emotionalTone: "Intimate",
          recommendedLens: "33mm",
          storyboardFrame: "/frame2.jpg",
          cameraSettings: {
            lens: "Meike 33mm f/1.4",
            aperture: "f/2.8",
            shutter: "1/48s",
            iso: "200",
            whiteBalance: "5600K",
            pictureProfile: "S-Log3",
            composition: "Hands on left third, rope leads diagonally across frame",
            notes: "Shoot from slightly above. Let the background go soft.",
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
          description: "Close-up profile of the fisherman looking toward the horizon. First rays of sun hit his face. Eyes full of quiet determination.",
          motivation: "The emotional core. A face that carries the weight and beauty of a simple life. The sunrise mirrors his hope.",
          shotType: "Close-up",
          emotionalTone: "Hopeful",
          recommendedLens: "55mm",
          storyboardFrame: "/frame3.jpg",
          cameraSettings: {
            lens: "Meike 55mm f/1.4",
            aperture: "f/1.4",
            shutter: "1/48s",
            iso: "100",
            whiteBalance: "5600K",
            pictureProfile: "HLG",
            composition: "Face fills right two-thirds, sun creates rim light from behind",
            notes: "Expose for the face, let the background bloom. Shoot in HLG for natural skin tones.",
          },
        },
        {
          beatNumber: 4,
          description: "Extreme wide aerial shot of the small wooden boat on vast turquoise ocean. A single figure rows toward the open horizon.",
          motivation: "The scale shift. Our character against the infinite. This is the thesis of the film \u2014 one small life against the vastness.",
          shotType: "Aerial",
          emotionalTone: "Awe",
          recommendedLens: "Find X9",
          storyboardFrame: "/frame4.jpg",
          cameraSettings: {
            lens: "Find X9 (wide mode)",
            aperture: "f/2.2",
            shutter: "1/50s",
            iso: "100",
            whiteBalance: "5600K",
            pictureProfile: "Standard",
            composition: "Boat centered, water patterns create leading lines outward",
            notes: "Use drone or high vantage point. Shoot during golden hour for warm water tones.",
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
          description: "Low angle looking up at boat mast and ropes against a dramatic orange sunrise sky. Warm light filters through the rigging.",
          motivation: "The transcendence shot. Looking up suggests aspiration and hope. The film's visual climax.",
          shotType: "Wide",
          emotionalTone: "Transcendent",
          recommendedLens: "33mm",
          storyboardFrame: "/frame5.jpg",
          cameraSettings: {
            lens: "Meike 33mm f/1.4",
            aperture: "f/5.6",
            shutter: "1/48s",
            iso: "100",
            whiteBalance: "5600K",
            pictureProfile: "S-Log3",
            composition: "Mast creates vertical line through center, sun flares through rigging",
            notes: "Shoot directly into sun. Use lens hood to minimize flare. Grad ND filter recommended.",
          },
        },
      ],
    },
  ],
};

export const sampleProject: Project = {
  id: "demo-1",
  title: "The Last Fisherman of Male",
  createdAt: "2026-06-18",
  updatedAt: "2026-06-18",
  scriptment: sampleScriptment,
  heroFrame: "/frame1.jpg",
  shotCount: 5,
  completedShots: 0,
};

export const shotTypeIcons: Record<string, string> = {
  Establishing: "Maximize",
  Wide: "Maximize",
  Medium: "Square",
  "Close-up": "Circle",
  ECU: "Focus",
  POV: "Eye",
  Aerial: "Cloud",
};

export const emotionalToneColors: Record<string, string> = {
  Contemplative: "bg-[#4A5568]",
  Intimate: "bg-[#744210]",
  Hopeful: "bg-[#2F855A]",
  Awe: "bg-[#2B6CB0]",
  Transcendent: "bg-[#6B46C1]",
  Melancholy: "bg-[#553C3C]",
  Tense: "bg-[#742A2A]",
  Joyful: "bg-[#975A16]",
};

export const samplePrompts = [
  "Golden hour portrait at the harbor",
  "Night market in the rain",
  "Morning routine \u2014 cinematic montage",
  "The last fisherman of the island",
];
