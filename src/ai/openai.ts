import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.AI_API_KEY
});

export const generateChatResponse = async (messages: any[]) => {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages
    });

    return completion.choices[0].message.content;
};