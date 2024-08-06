import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
    let body: { imageUrl?: string };

    try {
        body = await request.json();
    } catch (error) {
        return NextResponse.json({ error: 'Invalid JSON body' });
    }

    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
        return NextResponse.json({ error: 'Image URL is required.' });
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: JSON.stringify([
                        { type: "text", text: "What category does this food belong to? Provide a one word answer." },
                        { type: "image_url", image_url: { url: imageUrl } },
                    ]),
                },
            ],
            max_tokens: 100,
        });

        const category = response.choices[0].message.content?.trim();
        return NextResponse.json({ category });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to categorize image: ' + (error as any).message });
    }
}
