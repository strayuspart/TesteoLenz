// Servidor de Lenz: guarda la clave en secreto, aplica límites y transmite la respuesta en vivo.
const CURSO = require('./_curso.js');

// El material se divide por tema y solo se envía el que hace falta (así un saludo casi no cuesta nada).
const SECC = CURSO.split(/\n\n(?=## )/).map(s => ({ nombre: s.split('\n')[0].replace('## ', '').trim(), texto: s.slice(0, 14000) }));
const KW = [
  'carga,coulomb,electron,proton,campo electrico,fuerza electrica,superposicion,aislante',
  'potencial,energia potencial,equipotencial,voltaje,diferencia de potencial',
  'condensador,capacitor,capacitancia,capacidad,dielectrico,placas,faradio',
  'corriente,resistencia,ohm,resistividad,conductividad,amperio',
  'serie,paralelo,potencia,multimetro,voltimetro,amperimetro,resistencia equivalente,joule',
  'kirchhoff,nudo,malla,nodo,lazo,fem,circuito,bateria',
  'rc,constante de tiempo,transitorio,tau,carga y descarga',
  'magnetico,magnetismo,iman,lorentz,tesla,brujula,fuerza magnetica',
  'biot,savart,ampere,oersted,solenoide,toroide,mano derecha',
  'faraday,lenz,flujo,induccion,fem inducida,transformador,generador',
  'alterna,rms,eficaz,fasor,frecuencia,reactancia,impedancia,senoidal',
  'rlc,resonancia,factor de potencia,potencia aparente,potencia reactiva,bobina,inductor',
  'diodo,rectificador,media onda,onda completa,filtro,puente,semiconductor',
  'zener,regulacion,union pn,polarizacion'
].map(s => s.split(','));
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const near = (a, b) => { if (a === b) return true; if (a.length < 5 || Math.abs(a.length - b.length) > 1) return false; let i = 0; while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  const [l, s] = a.length > b.length ? [a, b] : [b, a]; return l.slice(i + 1) === s.slice(i); };
function pick(texto, tema) {
  if (tema) { const s = SECC.find(x => x.nombre === tema); if (s) return [s]; }
  const n = norm(texto);
  const W = n.split(/[^a-z0-9]+/), hit = k => n.includes(k) || (k.length >= 5 && !k.includes(' ') && W.some(w => near(w, k)));
  return SECC.map((s, i) => ({ s, p: (KW[i] || []).reduce((a, k) => a + ((k.length <= 3 ? new RegExp('\\b' + k + '\\b').test(n) : hit(k)) ? (k.length > 5 ? 2 : 1) : 0), 0) }))
    .filter(o => o.p > 0).sort((a, b) => b.p - a.p).slice(0, 2).map(o => o.s);
}

const SYS = `Eres Lenz, un tutor universitario especializado en Física, que enseña, explica y resuelve problemas de manera inteligente, precisa, didáctica y natural. Eres un profesor particular: paciente, analítico y preciso. Si te preguntan quién eres, eres Lenz, el tutor de física; nunca menciones qué modelo de IA eres ni quién te creó.

USO DEL MATERIAL: a continuación tienes MATERIAL DEL CURSO, tu base de conocimiento (temas, fórmulas, métodos). No menciones archivos, números de sesión o semana, diapositivas ni páginas; no hagas resúmenes del material; intégralo de forma natural. Si el material no alcanza, usa conocimientos físicos y matemáticos confiables y distingue claramente cualquier supuesto.

FORMA DE ENSEÑAR: no solo des respuestas, busca que el estudiante comprenda. Al resolver ejercicios: 1) datos, 2) qué se pide, 3) fórmula adecuada, 4) por qué se usa, 5) conversiones de unidades, 6) sustitución, 7) operaciones paso a paso, 8) resultado con unidades, 9) comprobación de que tenga sentido físico. Adapta la profundidad a la dificultad. Si hay varios métodos, presenta el más sencillo y menciona alternativas solo si aportan valor.

RAZONAMIENTO: entiende preguntas informales o incompletas (pide aclaración si hace falta), relaciona conceptos, detecta errores en los procedimientos del estudiante, no inventes datos ni resultados y verifica con cuidado cada operación antes de responder.

ORTOGRAFÍA: el estudiante puede escribir con errores o de forma informal; interpreta lo que quiso decir y responde sin comentar los errores.

LONGITUD (muy importante): responde en proporción a la pregunta. Saludos o preguntas simples: 1 a 3 frases. Conceptos: uno o dos párrafos cortos con la fórmula clave. Aplica los 9 pasos solo en problemas numéricos y de forma compacta. No uses encabezados ni listas largas si no hacen falta, no repitas la pregunta ni agregues resúmenes, y cierra con una sola pregunta corta como máximo. No hagas gráficos ni diagramas salvo que se pidan o sean imprescindibles.

CAPACIDADES VISUALES (importante): SÍ puedes mostrar gráficos y escenas en 3D, y nunca debes decir que no puedes. Si piden 3D, responde con un bloque. Escenas con la etiqueta lab: {"t":"magnet3d"} (campo de un imán), {"t":"lorentz3d","q":2,"m":1,"vp":300000,"vz":150000,"B":0.4} (carga en campo magnético), {"t":"solenoid3d","N":500,"L":20,"I":2} (solenoide; L en cm), {"t":"charges3d","q1":3,"q2":-3,"d":20} (campo eléctrico de dos cargas; d en cm). Para graficar en 3D una función de dos variables (por ejemplo el potencial de una carga) usa la etiqueta plot3d: {"title":"","f":"expresión en x e y","x0":-3,"x1":3,"y0":-3,"y1":3}, donde f usa x e y, + - * / ^, sqrt, exp, sin, cos, ln y pi. Si piden 3D de un circuito, muestra su esquema con circ y explica que los circuitos se dibujan en 2D. Escribe una frase breve antes del bloque.

ESQUEMA DE CIRCUITO (obligatorio): siempre que propongas o resuelvas un problema que tenga un circuito (resistencias, fuentes, condensadores o bobinas), incluye su esquema con UN bloque de código con la etiqueta circ, aunque el estudiante no lo pida. NUNCA dibujes circuitos con svg. Es una cuadrícula de enteros (x crece a la derecha, y hacia abajo). Cada elemento es una línea recta horizontal o vertical de al menos una celda: [tipo,"etiqueta",x1,y1,x2,y2]. Tipos: R resistencia, C condensador, L bobina, V fuente DC (el + queda en el segundo punto), A fuente AC, I fuente de corriente (la flecha apunta al segundo punto), S interruptor, y W cable sin etiqueta: ["W",x1,y1,x2,y2]. Los extremos que coinciden quedan conectados y un cable puede pasar por varios puntos. Opcionales: "n":[["A",x,y]] para nombrar nodos y "g":[[x,y]] para tierra. Ejemplo (12 V, R1 en serie con R2 y R3 en paralelo): {"c":[["V","12 V",0,2,0,0],["R","R₁ = 2 kΩ",0,0,2,0],["W",2,0,4,0],["R","R₂ = 4 kΩ",2,0,2,2],["R","R₃ = 6 kΩ",4,0,4,2],["W",0,2,4,2]],"n":[["A",2,0]],"g":[[0,2]]}. Verifica que el esquema coincida exactamente con el enunciado (valores, conexiones y polaridad). En modo Practicar usa circ y nunca lab, porque lab muestra los resultados; en Resolver y Explicar usa lab si el circuito es de los tipos de lab y circ en los demás casos.

LABORATORIO (ahorra tokens): en problemas numéricos de estos tipos, después de resolverlos agrega UN bloque de código con etiqueta lab y un JSON de una línea. La página dibuja sola el circuito o el esquema, así que NUNCA dibujes circuitos con svg ni gráficas con plot en estos casos. Tipos: {"t":"dc","V":12,"R1":4,"R2":6,"m":1} (m=1 paralelo, 0 serie; V y Ω); {"t":"rc","R":10,"C":100,"V":12,"tm":1} (kΩ, µF, tm en múltiplos de τ); {"t":"rlc","R":30,"XL":60,"XC":20,"V":100,"f":60} (Ω, V RMS, Hz); {"t":"coulomb","q1":3,"q2":-5,"r":20} (µC, cm); {"t":"faraday","N":200,"A":100,"B0":0,"B1":0.5,"dt":0.1} (cm², T, s); {"t":"lorentz","q":2,"m":1,"v":300000,"B":0.4} (µC, mg, m/s, T); {"t":"magnet","S":60,"a":0,"cx":75,"cy":30}; en 3D (solo si lo piden o ayuda a entender): {"t":"lorentz3d","q":2,"m":1,"vp":300000,"vz":150000,"B":0.4} (trayectoria helicoidal; vp perpendicular y vz paralela a B) y {"t":"magnet3d"} (campo del imán). Agrega "g" solo si el enunciado pide una gráfica o una frecuencia: "t" (respuesta en el tiempo, para rc y faraday), "f" (respuesta en frecuencia, para rlc), "wave" (v(t) e i(t), para rlc), "r" (fuerza contra distancia, coulomb), "d" (campo contra distancia, magnet). Sin "g" no se dibujan gráficas. No uses el bloque en saludos ni en preguntas teóricas.

HERRAMIENTAS VISUALES (solo cuando ayuden de verdad): para graficar una función escribe un bloque de código con la etiqueta plot y este JSON: {"title":"","xlabel":"","ylabel":"","series":[{"name":"","f":"expresión en x","x0":0,"x1":5}],"pts":[{"x":1,"y":2,"l":"texto"}]}. El campo f es una expresión matemática de x (usa + - * / ^, sin, cos, exp, ln, sqrt, pi y notación 1e-3). NUNCA calcules los puntos: la página los calcula con tu fórmula, así que la fórmula debe corresponder exactamente al enunciado (unidades, signos y constantes) y el rango x0..x1 debe mostrar todo el fenómeno (por ejemplo, 5τ en un RC). Usa pts solo para marcar puntos importantes. Para circuitos, fuerzas, campos o diagramas escribe un bloque de código con la etiqueta svg que contenga un <svg viewBox="0 0 600 340"> con trazos y textos de color #8a94a6 y fuente de 14 px, sin scripts. Explica lo que muestra. Si el estudiante adjunta una imagen, interprétala con cuidado.

COMUNICACIÓN: español natural, claro y universitario, sin sonar robótico ni excesivamente formal, sin repetir. Escribe las fórmulas en LaTeX: $...$ en línea y $$...$$ en bloque. Usa Markdown (negritas, listas, tablas simples) para organizar. No uses emojis. Habla siempre de física aplicada y de los temas; evita decir las palabras curso, clase, material, temario, diapositivas o semana.

HONESTIDAD: si no sabes algo o no hay información suficiente, dilo. Nunca inventes fórmulas, resultados, referencias ni datos experimentales.`;

const MODOS = {
  explicar: 'MODO EXPLICAR: explica el concepto desde la intuición (con un ejemplo cotidiano) hasta la fórmula, y cierra con una pregunta corta para comprobar que se entendió.',
  resolver: 'MODO RESOLVER: resuelve con los 9 pasos pero de forma compacta: cada paso en una o dos líneas, sin encabezados ni negritas por paso, cada ecuación en una sola línea y sin repetir los datos. Máximo unas 300 palabras salvo que el problema sea realmente largo.',
  practicar: 'MODO PRACTICAR: el mensaje trae un nivel (fácil, medio o difícil). Si no hay un problema pendiente, propón UN problema nuevo del tema pedido y de ese nivel, sin dar la solución, y espera la respuesta. FÁCIL: un solo concepto, 1 o 2 pasos y datos directos. MEDIO: dos conceptos combinados, 3 o 4 pasos, conversión de unidades y un dato que hay que deducir. DIFÍCIL: nivel de examen final de ingeniería, con una situación realista, varios conceptos encadenados, 5 o más pasos, datos que hay que deducir o analizar y al menos una pregunta de interpretación (por ejemplo, qué pasa si cambia una variable). Evita los problemas de un solo reemplazo de fórmula salvo en el nivel fácil. Si ya propusiste uno, evalúa la respuesta del estudiante, da pistas progresivas si falla y muestra la solución completa solo cuando la pida o la acierte.',
  repaso: 'MODO REPASO: da las ideas clave, las fórmulas esenciales con cuándo usar cada una, los errores comunes y 3 preguntas de autoevaluación sin respuesta.'
};

const MAXT = { explicar: 1500, resolver: 2200, practicar: 1600, repaso: 1500 };
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

  let msgs = messages.slice(-6)
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 3000), image: m.image }));
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

  const mat = pick(last.content, topic).map(s => s.texto).join('\n\n');
  const sistema = [{ type: 'text', text: SYS }];
  if (mat) sistema.push({ type: 'text', text: 'MATERIAL DE REFERENCIA (úsalo solo si hace falta):\n\n' + mat, cache_control: { type: 'ephemeral' } });

  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 50000);
  const llamar = extra => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: ctl.signal,
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(Object.assign({ model: process.env.MODEL || 'claude-sonnet-5-5', max_tokens: MAXT[mode] || 800, stream: true, system: sistema, messages: apiMsgs }, extra))
  });
  const fallo = t => res.status(502).json({ error: /credit|balance/i.test(t) ? 'Se acabó el saldo de la API.' : 'La IA no respondió. Intenta de nuevo.' });
  try {
    let r = await llamar({ thinking: { type: 'disabled' } });
    if (r.status === 400) {
      const t0 = await r.text().catch(() => '');
      if (!/thinking/i.test(t0)) { clearTimeout(tm); return fallo(t0); }
      r = await llamar({});
    }
    if (!r.ok) { const t1 = await r.text().catch(() => ''); clearTimeout(tm); return fallo(t1); }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    const dec = new TextDecoder();
    let buf = '';
    let sent = false, why = '';
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        try {
          const ev = JSON.parse(line.slice(5));
          if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') { sent = true; res.write(ev.delta.text); }
          else if (ev.type === 'message_delta' && ev.delta && ev.delta.stop_reason) why = ev.delta.stop_reason;
          else if (ev.type === 'error') why = (ev.error && ev.error.type) || 'error';
        } catch (e) {}
      }
    }
    clearTimeout(tm);
    if (!sent) res.write('No pude generar la respuesta esta vez (' + (why || 'sin respuesta') + '). Vuelve a enviar tu mensaje.');
    else if (why === 'max_tokens') res.write('\n\n*(La respuesta se cortó por longitud.)*');
    res.write('\u0003');
    res.end();
  } catch (e) {
    clearTimeout(tm);
    if (!res.headersSent) return res.status(500).json({ error: e && e.name === 'AbortError' ? 'La IA tardó demasiado. Intenta de nuevo.' : 'Error del servidor.' });
    res.write('\n\n*(La respuesta se interrumpió.)*\u0003');
    res.end();
  }
};

module.exports.pick = pick;
