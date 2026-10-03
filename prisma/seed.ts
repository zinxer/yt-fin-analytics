// prisma/seed.ts
import fs from 'fs';
import { getPrisma, disconnectPrisma } from '../src/db';

const prisma = getPrisma();

async function main() {
    const configs = [
        { key: 'OPENAI_MODEL_SMALL', value: 'gpt-4o-mini', description: 'The OpenAI model used for small tasks.' },
        { key: 'OPENAI_MODEL_LARGE', value: 'gpt-4o', description: 'The OpenAI model used for large tasks.' },
    ];
    for (const config of configs) {
        await prisma.configs.upsert({ where: { key: config.key }, create: config, update: {} });
    }
    console.log('-I- Seeded configs table.');

    const template = {
        name: 'video_transcript_analysis',
        user_input: fs.readFileSync('./assets/for_llm/user_input.txt', 'utf8'),
        system_message: fs.readFileSync('./assets/for_llm/system_message.txt', 'utf8'),
        json_schema: JSON.parse(fs.readFileSync('./assets/for_llm/json_schema.json', 'utf8')),
        description: 'This prompt is used to analyze a video transcript',
        is_active: true,
    };
    await prisma.llm_prompt_templates.upsert({ where: { name: template.name }, create: template, update: template });
    console.log('-I- Seeded llm_prompt_templates table.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await disconnectPrisma();
    });
