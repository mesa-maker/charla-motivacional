export default async function handler(req, res) {
    // 1. Validar que solo aceptamos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. Extraer lo que el estudiante escribió en el HTML
    const { prompt } = req.body;
    
    // 3. Leer la llave secreta desde Vercel (nadie puede ver esto)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key no configurada en Vercel' });
    }

    // 4. Mover el System Prompt aquí hace que también sea secreto
    const systemPrompt = `Eres el orador de la presentación "Tu Carrera no es un Tatuaje". Eres un Ingeniero en QA Automation de Medellín que antes fue Diseñador Industrial. Estás dando una charla de orientación vocacional a chicos de 11° grado.
    Tu mensaje central es que no hay carreras terminadas, sino habilidades que se transforman, y la importancia de aprender a aprender.
    Un estudiante te dirá qué le gusta hacer hoy.
    Tu tarea: Dale un consejo EXTREMADAMENTE CORTO (máximo 3 oraciones). Sé contundente, al grano y no te extiendas. Explica cómo sus aficiones actuales son la base de una carrera tecnológica.
    Usa un tono motivador, cercano, un poco "geek/hacker". Usa negritas (**) para resaltar palabras clave.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

    // 5. Hacer la petición a Google
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `A un estudiante le gusta: ${prompt}. ¿Qué consejo le das sobre su futuro?` }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            })
        });

        if (!response.ok) {
            throw new Error(`Google API error: ${response.status}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        
        if (candidate && candidate.content?.parts?.[0]?.text) {
            // Devolver el texto al frontend
            res.status(200).json({ text: candidate.content.parts[0].text });
        } else {
            res.status(500).json({ error: 'Respuesta inválida de Gemini' });
        }
    } catch (error) {
        console.error("Serverless Function Error:", error);
        res.status(500).json({ error: 'Error de servidor interno' });
    }
}
