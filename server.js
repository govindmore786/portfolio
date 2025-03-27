require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.json());
app.use(cors({origin:"*"}));
app.use(express.static("build"));
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TOGETHER_URL = "https://api.together.xyz/v1/chat/completions";

// Load resume data
const resumeData = JSON.parse(fs.readFileSync("resume.json", "utf-8"));

// Updated to use a supported model from Together AI
const MODEL_NAME = "mistralai/Mistral-7B-Instruct-v0.1"; // Updated model name

async function fetchChatResponse(messages, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(
                TOGETHER_URL,
                {
                    model: MODEL_NAME,
                    messages: messages,
                    max_tokens: 200,
                },
                {
                    headers: {
                        Authorization: `Bearer ${TOGETHER_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                }
            );

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.response ? error.response.data : error.message);
            if (attempt === retries) throw error;
            await new Promise(res => setTimeout(res, 2000 * attempt));
        }
    }
}

app.post("/chat", async (req, res) => {
    const { message } = req.body;

    const messages = [
        { 
            role: "system", 
            content: `You are an AI chatbot trained to answer questions based on the following resume data: ${JSON.stringify(resumeData)}. 
                     Only answer questions related to this resume. For other questions, respond that you can only answer questions about Govind's resume.`
        },
        { role: "user", content: message }
    ];

    try {
        const reply = await fetchChatResponse(messages);
        res.json({ reply });
    } catch (error) {
        console.error("Final API Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Error fetching response from AI service" });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));