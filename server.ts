import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// We define our structural presets to ensure the exact requested examples 
// are responsive and perfectly rendered instantly.
const presets: Record<string, any> = {
  sunshine: {
    keyPhrase: "Sunshine",
    visuals: {
      theme: "sunshine",
      primaryColor: "#f59e0b", // Warm amber
      secondaryColor: "#fef08a", // Soft light yellow
      backgroundColor: "#1e1b4b", // Deep twilight indigo backdrop for high contrast
      particleCount: 50,
      particleSpeed: 0.4,
      visualStyle: "canopy",
      brightnessMultiplier: 1.2
    },
    audio: {
      binauralEnabled: true,
      carrierFreq: 136.1, // Earth frequency (Om)
      beatFreq: 4.5, // Deep theta wave
      musicSynthType: "acoustic-guitar",
      volume: 0.8,
      natureSounds: {
        leavesRustling: true,
        birdsChirping: true,
        gentleWater: false,
        softWind: true,
        fireCrackling: false,
        binauralBeats: true
      },
      eqFilterCutoff: 1200
    },
    narrativeText: "A warm golden hour sunbeams drift softly through the leaves above. Breathe in the warm glowing light; let everything else dissolve."
  },
  star: {
    keyPhrase: "Star",
    visuals: {
      theme: "star",
      primaryColor: "#61a5fa", // Soft glowing blue
      secondaryColor: "#c084fc", // Deep lavender
      backgroundColor: "#050510", // Near space black
      particleCount: 150,
      particleSpeed: 0.15,
      visualStyle: "constellations",
      brightnessMultiplier: 1.0
    },
    audio: {
      binauralEnabled: true,
      carrierFreq: 110.0, // Low grounding A note
      beatFreq: 3.5, // Delta wave for deep deep relaxation
      musicSynthType: "space-synth",
      volume: 0.7,
      natureSounds: {
        leavesRustling: false,
        birdsChirping: false,
        gentleWater: false,
        softWind: true,
        fireCrackling: false,
        binauralBeats: true
      },
      eqFilterCutoff: 650
    },
    narrativeText: "Beneath the starry dome of the deep Cosmos, you are perfectly secure, light, and still. Every tiny star is twinkling in phase with your breath."
  },
  forest: {
    keyPhrase: "Forest",
    visuals: {
      theme: "forest",
      primaryColor: "#10b981", // Rich emerald green
      secondaryColor: "#a7f3d0", // Gentle mint highlight
      backgroundColor: "#022c22", // Deep pine forest dark teal
      particleCount: 80,
      particleSpeed: 0.3,
      visualStyle: "trees",
      brightnessMultiplier: 1.1
    },
    audio: {
      binauralEnabled: true,
      carrierFreq: 144.0, // Deep forest solfeggio frequency
      beatFreq: 6.0, // Forest theta wave
      musicSynthType: "flute",
      volume: 0.85,
      natureSounds: {
        leavesRustling: true,
        birdsChirping: true,
        gentleWater: true,
        softWind: true,
        fireCrackling: false,
        binauralBeats: true
      },
      eqFilterCutoff: 1000
    },
    narrativeText: "Dappled light sprinkles down onto mossy forest floor as wind whispers through tall evergreen boughs. The stream sings a sweet, continuous lullaby."
  }
};

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Initialized GoogleGenAI client successfully.");
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
  }
} else {
  console.log("No GEMINI_API_KEY environment variable detected or default placeholder used. Gemini generation will run with highly responsive local heuristic synthesis.");
}

// Generate Relaxation Settings Endpoint
app.post("/api/generate-environment", async (req, res) => {
  const { phrase } = req.body;
  if (!phrase || typeof phrase !== "string") {
    return res.status(400).json({ error: "Phrase is required and must be a string." });
  }

  const cleanPhrase = phrase.trim().toLowerCase();

  // 1. Check direct preset matches
  if (cleanPhrase.includes("sunshine") || cleanPhrase === "sun") {
    return res.json(presets.sunshine);
  }
  if (cleanPhrase.includes("star") || cleanPhrase.includes("cosmic") || cleanPhrase === "galaxy") {
    return res.json(presets.star);
  }
  if (cleanPhrase.includes("forest") || cleanPhrase.includes("woods") || cleanPhrase.includes("jungle")) {
    return res.json(presets.forest);
  }

  // 2. Fallback or use Gemini API for creative generation
  if (ai) {
    try {
      console.log(`Querying Gemini with natural language phrase: "${phrase}"`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Create a customized relaxation environment for the phrase: "${phrase}". Map this to relaxing parameters.`,
        config: {
          systemInstruction: "You are a meditation and audio-visual relaxation synthesizer coordinator. Convert any descriptive place, setting, or feeling into a structured JSON configuration for client-side HTML Canvas renderer and Web Audio synth engines. Choose atmospheric colors, custom musical synthesizers, sound flags, and write a peaceful, cozy guiding narrative of 1-2 comforting sentences.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              keyPhrase: { type: Type.STRING },
              visuals: {
                type: Type.OBJECT,
                properties: {
                  theme: { 
                    type: Type.STRING, 
                    description: "Pick matching visual theme",
                    enum: ["sunshine", "star", "forest", "custom-warm", "custom-cool", "custom-cosmic", "custom-nature"]
                  },
                  primaryColor: { type: Type.STRING, description: "hex color matching theme" },
                  secondaryColor: { type: Type.STRING, description: "hex highlight color" },
                  backgroundColor: { type: Type.STRING, description: "dark background hex color (highly contrastive offset e.g. deep blue, charcoal, dark plum)" },
                  particleCount: { type: Type.INTEGER, description: "number of particles between 30 and 150" },
                  particleSpeed: { type: Type.NUMBER, description: "how fast objects move or sway from 0.05 to 1.0" },
                  visualStyle: { 
                    type: Type.STRING, 
                    enum: ["canopy", "waves", "constellations", "nebula", "trees", "particles", "embers", "aurora", "fluid"]
                  },
                  brightnessMultiplier: { type: Type.NUMBER, description: "relative light bloom intensity 0.5 to 1.5" }
                },
                required: ["theme", "primaryColor", "secondaryColor", "backgroundColor", "particleCount", "particleSpeed", "visualStyle", "brightnessMultiplier"]
              },
              audio: {
                type: Type.OBJECT,
                properties: {
                  binauralEnabled: { type: Type.BOOLEAN },
                  carrierFreq: { type: Type.NUMBER, description: "Carrier frequency in Hz (100 to 220)" },
                  beatFreq: { type: Type.NUMBER, description: "Binaural delta/theta gap in Hz (3.0 to 10.0)" },
                  musicSynthType: { 
                    type: Type.STRING, 
                    enum: ["acoustic-guitar", "space-synth", "flute", "warm-pad", "crystal-chime", "soft-organ"]
                  },
                  volume: { type: Type.NUMBER, description: "overall synth level 0.1 to 1.0" },
                  natureSounds: {
                    type: Type.OBJECT,
                    properties: {
                      leavesRustling: { type: Type.BOOLEAN },
                      birdsChirping: { type: Type.BOOLEAN },
                      gentleWater: { type: Type.BOOLEAN },
                      softWind: { type: Type.BOOLEAN },
                      fireCrackling: { type: Type.BOOLEAN },
                      binauralBeats: { type: Type.BOOLEAN }
                    },
                    required: ["leavesRustling", "birdsChirping", "gentleWater", "softWind", "fireCrackling", "binauralBeats"]
                  },
                  eqFilterCutoff: { type: Type.NUMBER, description: "low pass filter cutoff in Hz (300 to 2500)" }
                },
                required: ["binauralEnabled", "carrierFreq", "beatFreq", "musicSynthType", "volume", "natureSounds", "eqFilterCutoff"]
              },
              narrativeText: { type: Type.STRING, description: "Deeply soothing text of 1 or 2 comforting sentences explaining the magic of this custom synthesized environment." }
            },
            required: ["keyPhrase", "visuals", "audio", "narrativeText"]
          }
        }
      });

      const responseText = response.text;
      if (responseText) {
        const generatedConfig = JSON.parse(responseText.trim());
        return res.json(generatedConfig);
      }
    } catch (error) {
      console.error("Gemini creative synthesis failed, resorting to custom rule engine:", error);
    }
  }

  // 3. Robust dynamic rule generator if Gemini is unavailable or errors
  // This analyzes words in the phrase to craft highly realistic parameter maps.
  console.log(`Generating environment dynamically using rule engine for: "${phrase}"`);
  
  let theme: any = 'custom-nature';
  let primaryColor = "#4ade80"; // green
  let secondaryColor = "#22c55e";
  let backgroundColor = "#022c22";
  let particleCount = 70;
  let particleSpeed = 0.35;
  let visualStyle: any = 'particles';
  let musicSynthType: any = "warm-pad";
  let eqFilterCutoff = 1000;
  
  let leavesRustling = false;
  let birdsChirping = false;
  let gentleWater = false;
  let softWind = true;
  let fireCrackling = false;
  let binauralBeats = true;

  if (cleanPhrase.includes("rain") || cleanPhrase.includes("water") || cleanPhrase.includes("ocean") || cleanPhrase.includes("beach") || cleanPhrase.includes("sea")) {
    theme = 'custom-cool';
    primaryColor = "#38bdf8"; // Light sky blue
    secondaryColor = "#0284c7"; // Ocean blue
    backgroundColor = "#082f49"; // Deep aqua marine
    particleSpeed = 0.6;
    visualStyle = 'waves';
    musicSynthType = 'warm-pad';
    gentleWater = true;
    softWind = true;
  } else if (cleanPhrase.includes("fire") || cleanPhrase.includes("fireplace") || cleanPhrase.includes("candle") || cleanPhrase.includes("cozy") || cleanPhrase.includes("ember") || cleanPhrase.includes("warm")) {
    theme = 'custom-warm';
    primaryColor = "#f97316"; // Bright orange
    secondaryColor = "#ef4444"; // Warm red
    backgroundColor = "#1c0d02"; // Cozy walnut/charcoal depth
    particleCount = 90;
    particleSpeed = 0.5;
    visualStyle = 'embers';
    musicSynthType = 'acoustic-guitar';
    fireCrackling = true;
    softWind = false;
  } else if (cleanPhrase.includes("aurora") || cleanPhrase.includes("night") || cleanPhrase.includes("purple") || cleanPhrase.includes("dream")) {
    theme = 'custom-cosmic';
    primaryColor = "#a855f7"; // Glowing purple
    secondaryColor = "#14b8a6"; // Aurora teal
    backgroundColor = "#0a0915"; // Astral body
    particleCount = 120;
    particleSpeed = 0.25;
    visualStyle = 'aurora';
    musicSynthType = 'space-synth';
    softWind = true;
    binauralBeats = true;
  } else if (cleanPhrase.includes("garden") || cleanPhrase.includes("meadow") || cleanPhrase.includes("mountain") || cleanPhrase.includes("spring")) {
    theme = 'custom-nature';
    primaryColor = "#84cc16"; // Bright lime
    secondaryColor = "#22c55e"; // Grass green
    backgroundColor = "#022c22"; // Undergrowth deep teal
    particleCount = 60;
    particleSpeed = 0.3;
    visualStyle = 'trees';
    musicSynthType = 'flute';
    birdsChirping = true;
    leavesRustling = true;
    softWind = true;
  }

  // Set low-pass filter relative to visual speed
  eqFilterCutoff = Math.round(500 + particleSpeed * 1500);

  const ruleSettings = {
    keyPhrase: phrase.charAt(0).toUpperCase() + phrase.slice(1),
    visuals: {
      theme,
      primaryColor,
      secondaryColor,
      backgroundColor,
      particleCount,
      particleSpeed,
      visualStyle,
      brightnessMultiplier: 1.0
    },
    audio: {
      binauralEnabled: true,
      carrierFreq: 136.1,
      beatFreq: 5.5,
      musicSynthType,
      volume: 0.8,
      natureSounds: {
        leavesRustling,
        birdsChirping,
        gentleWater,
        softWind,
        fireCrackling,
        binauralBeats
      },
      eqFilterCutoff
    },
    narrativeText: `The elements of your phrase "${phrase}" have dissolved into a tailored auditory blanket. Ground yourself in this custom shelter as the dynamic layers balance and sync with your rhythm.`
  };

  return res.json(ruleSettings);
});

// Configure Vite or Serve Static Files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully booted and listening on host 0.0.0.0, port ${PORT}`);
  });
}

startServer();
