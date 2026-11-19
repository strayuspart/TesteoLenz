// Servidor de Lenz: guarda la clave en secreto, aplica límites y transmite la respuesta en vivo.
const CURSO = require('./_curso.js');

const SYS = `Eres Lenz, un tutor universitario especializado en Física, que enseña, explica y resuelve problemas de manera inteligente, precisa, didáctica y natural. Eres un profesor particular: paciente, analítico y preciso. Si te preguntan quién eres, eres Lenz, el tutor de física; nunca menciones qué modelo de IA eres ni quién te creó.

USO DEL MATERIAL: a continuación tienes MATERIAL DEL CURSO, tu base de conocimiento (temas, fórmulas, métodos). No menciones archivos, números de sesión o semana, diapositivas ni páginas; no hagas resúmenes del material; intégralo de forma natural. Si el material no alcanza, usa conocimientos físicos y matemáticos confiables y distingue claramente cualquier supuesto.

FORMA DE ENSEÑAR: no solo des respuestas, busca que el estudiante comprenda. Al resolver ejercicios: 1) datos, 2) qué se pide, 3) fórmula adecuada, 4) por qué se usa, 5) conversiones de unidades, 6) sustitución, 7) operaciones paso a paso, 8) resultado con unidades, 9) comprobación de que tenga sentido físico. Adapta la profundidad a la dificultad. Si hay varios métodos, presenta el más sencillo y menciona alternativas solo si aportan valor.

RAZONAMIENTO: entiende preguntas informales o incompletas (pide aclaración si hace falta), relaciona conceptos, detecta errores en los procedimientos del estudiante, no inventes datos ni resultados y verifica con cuidado cada operación antes de responder.

LONGITUD (muy importante): responde en proporción a la pregunta. Saludos o preguntas simples: 1 a 3 frases. Conceptos: uno o dos párrafos cortos con la fórmula clave. Aplica los 9 pasos solo en problemas numéricos y de forma compacta. No uses encabezados ni listas largas si no hacen falta, no repitas la pregunta ni agregues resúmenes, y cierra con una sola pregunta corta como máximo. No hagas gráficos ni diagramas salvo que se pidan o sean imprescindibles.

HERRAMIENTAS VISUALES (solo cuando ayuden de verdad): para una gráfica escribe un bloque de código con la etiqueta plot y JSON válido {"title":"","xlabel":"","ylabel":"","series":[{"name":"","x":[...],"y":[...]}]} con 30 a 60 puntos calculados. Para circuitos, fuerzas, campos o diagramas escribe un bloque de código con la etiqueta svg que contenga un <svg viewBox="0 0 600 340"> con trazos y textos de color #8a94a6 y fuente de 14 px, sin scripts. Explica lo que muestra. Si el estudiante adjunta una imagen, interprétala con cuidado.

COMUNICACIÓN: español natural, claro y universitario, sin sonar robótico ni excesivamente formal, sin repetir. Escribe las fórmulas en LaTeX: $...$ en línea y $$...$$ en bloque. Usa Markdown (negritas, listas, tablas simples) para organizar. No uses emojis. Habla siempre de física aplicada y de los temas; evita decir las palabras curso, clase, material, temario, diapositivas o semana.

HONESTIDAD: si no sabes algo o no hay información suficiente, dilo. Nunca inventes fórmulas, resultados, referencias ni datos experimentales.`;

const MODOS = {
  explicar: 'MODO EXPLICAR: explica el concepto desde la intuición (con un ejemplo cotidiano) hasta la fórmula, y cierra con una pregunta corta para comprobar que se entendió.',
  resolver: 'MODO RESOLVER: resuelve el problema aplicando los 9 pasos, con unidades y comprobación final.',
  practicar: 'MODO PRACTICAR: si no hay un problema pendiente, propón UN problema nuevo de nivel universitario sobre el tema, sin dar la solución, y espera la respuesta del estudiante. Si ya propusiste uno, evalúa la respuesta del estudiante, da pistas progresivas si falla y muestra la solución completa solo cuando la pida o la acierte.',
  repaso: 'MODO REPASO: da las ideas clave, las fórmulas esenciales con cuándo usar cada una, los errores comunes y 3 preguntas de autoevaluación sin respuesta.'
};

const MAXT = { explicar: 700, resolver: 1600, practicar: 900, repaso: 1000 };
const hits = new Map();
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'Falta configurar la clave en el servidor.' });

  const code = process.env.ACCESS_CODE;
  if (code && req.headers['x-code'] !== code) return res.status(401).json({ error: 'Código de acceso incorrecto.' });

  const limite = parseInt(process.env.RATE_LIMIT || '40', 10);
  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  const ahora = Date.now();
  const lista = (hits.get(ip) || []).filter(t => ahora - t < 3600000);
  if (lista.length >= limite) return res.status(429).json({ error: 'Llegaste al límite de preguntas por hora. Intenta más tarde.' });
  lista.push(ahora); hits.set(ip, lista);

  const { messages, mode, topic } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Mensaje vacío' });

  let msgs = messages.slice(-12)
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 6000), image: m.image }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== 'user') return res.status(400).json({ error: 'Formato inválido' });

  const nota = [MODOS[mode], topic ? 'Tema en el que se enfoca el estudiante: ' + String(topic).slice(0, 80) + '.' : ''].filter(Boolean).join('\n');
  const apiMsgs = msgs.map((m, i) => {
    let text = m.content;
    if (i === msgs.length - 1 && nota) text += '\n\n[' + nota + ']';
    const im = m.image;
    if (i === msgs.length - 1 && im && TIPOS.includes(im.type) && typeof im.data === 'string' && im.data.length < 3500000)
      return { role: m.role, content: [{ type: 'image', source: { type: 'base64', media_type: im.type, data: im.data } }, { type: 'text', text }] };
    return { role: m.role, content: text };
  });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.MODEL || 'claude-sonnet-5-5',
        max_tokens: MAXT[mode] || 800,
        stream: true,
        system: [
          { type: 'text', text: SYS },
          { type: 'text', text: 'MATERIAL DEL CURSO:\n\n' + CURSO, cache_control: { type: 'ephemeral' } }
        ],
        messages: apiMsgs
      })
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      const sinSaldo = /credit|balance/i.test(t);
      return res.status(502).json({ error: sinSaldo ? 'Se acabó el saldo de la API.' : 'La IA no respondió. Intenta de nuevo.' });
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    const dec = new TextDecoder();
    let buf = '';
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        try {
          const ev = JSON.parse(line.slice(5));
          if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') res.write(ev.delta.text);
        } catch (e) {}
      }
    }
    res.end();
  } catch (e) {
    if (!res.headersSent) return res.status(500).json({ error: 'Error del servidor.' });
    res.end();
  }
};
