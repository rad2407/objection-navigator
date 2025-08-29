// functions/index.js

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import cors from "cors";
import OpenAI from "openai";

// --- Secrets (v2) ---
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// --- CORS ---
const ALLOW_ORIGINS = [
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "https://objection-navigator-app.web.app",
  "https://objection-navigator-app.firebaseapp.com",
  "https://app.objectionsiq.com" // ← add your subdomain
];
const corsHandler = cors({
  origin: (origin, cb) => {
    if (!origin || ALLOW_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 3600,
});

// --- Hormozi-style ADA+C fallback ---
function fallbackAda({ objection, category }) {
  return {
    acknowledge:
      "Reframe the objection in neutral third-person language. Avoid quoting or affirming it in first person.",
    differentiate:
      "But you're not buying ads or design. You're buying closings. This system is built to turn strangers into signed clients — without you chasing.",
    anchor:
      "Your average deal is $8K to $15K. One close covers the cost. After that, it’s profit.",
    close: "Are you trying to save money, or make more money?",
    script:
      "Acknowledge: Yeah, it's not cheap. Good marketing that works never is.\n\n" +
      "Differentiate: But you're not buying ads or design. You're buying closings. This system is built to turn strangers into signed clients — without you chasing.\n\n" +
      "Anchor: Your average deal is $8K to $15K. One close covers the cost. After that, it’s profit.\n\n" +
      "Close: Are you trying to save money, or make more money?",
    category: category || "Price Objection",
  };
}

// --- Cloud Function ---
export const generateAda = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 20,
    maxInstances: 20,
    concurrency: 80,
    secrets: [OPENAI_API_KEY], // properly bind the secret
  },
  async (req, res) => {
    // Handle preflight quickly
    if (req.method === "OPTIONS") {
      return corsHandler(req, res, () => res.status(204).end());
    }

    return corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }

        const openaiKey = OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          logger.error("Missing OPENAI_API_KEY");
          return res.status(500).json({ error: "Server misconfiguration" });
        }

        const { objection, category, notes, industry = "real estate" } = req.body || {};
        if (!objection || typeof objection !== "string") {
          return res.status(400).json({ error: "Field 'objection' is required" });
        }

        // Load .env for local runs
require('dotenv').config();

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const OpenAI = require("openai");

// Define Firebase Secret for deployed functions
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

exports.generate = onRequest({ secrets: [OPENAI_API_KEY] }, async (req, res) => {
  try {
    // Local uses process.env from .env, deployed uses Secret Manager
    const apiKey = process.env.OPENAI_API_KEY || OPENAI_API_KEY.value();
    const openai = new OpenAI({ apiKey });

    // your logic here
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});


        const client = new OpenAI({ apiKey: openaiKey });

        const prompt = `
You are a sales coach for ${industry}. Write an ADA+C objection response in strict JSON format:
{
  "acknowledge": "...",
  "differentiate": "...",
  "anchor": "...",
  "close": "...",
  "script": "...",
  "category": "..."
}
Objection: "${objection}"
Category: ${category || "Uncategorized"}
Notes: ${notes || "-"}
ADA+C means: Acknowledge, Differentiate, Anchor, Close. Use short, clear, punchy sentences. No fluff. Speak like Alex Hormozi.
`;

        let result;
        try {
          const response = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            temperature: 1,
            messages: [{ role: "user", content: prompt }],
            // safer JSON mode for recent SDKs:
            response_format: { type: "json_object" },
          });
          const text = response.choices?.[0]?.message?.content || "";
          result = JSON.parse(text);
        } catch (err) {
          logger.error("OpenAI failed, using fallback", err);
          result = fallbackAda({ objection, category });
        }

        const sanitize = (v) => (typeof v === "string" ? v.trim() : "");

        const payload = {
          acknowledge: sanitize(result.acknowledge),
          differentiate: sanitize(result.differentiate),
          anchor: sanitize(result.anchor),
          close: sanitize(result.close),
          script: sanitize(result.script),
          category: sanitize(result.category || category || "Uncategorized"),
        };

        return res.status(200).json({ result: payload });
      } catch (err) {
        logger.error("generateAda fatal", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    });
  }
);
