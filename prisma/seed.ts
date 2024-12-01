// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    await prisma.configs.createMany({
        data: [
            {
                key: 'OPENAI_MODEL_SMALL',
                value: 'gpt-4o-mini', // or whichever model you want to use
                description: 'The OpenAI model used for small tasks.'
            },
            {
                key: 'OPENAI_MODEL_LARGE',
                value: 'gpt-4o',
                description: 'The OpenAI model used for large tasks.'
            }
        ]
    });
    console.log('-I- Seeded configs table.');

    await prisma.llm_prompt_templates.createMany({
        data: [
            {
                name: 'video_transcript_analysis',
                user_input: fs.readFileSync('./assets/for_llm/user_input.txt', 'utf8'),
                system_message: fs.readFileSync('./assets/for_llm/system_message.txt', 'utf8'),
                json_schema: fs.readFileSync('./assets/for_llm/json_schema.json', 'utf8'),
                description: 'This prompt is used to analyze a video transcript',
                is_active: true
            }
        ]
    });
    console.log('-I- Seeded llm_prompt_templates table.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });