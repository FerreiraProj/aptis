/**
 * YouTube transcript extractor — direct fetch approach.
 * Uses brace-counting JSON extraction to avoid regex truncation of ytInitialPlayerResponse.
 */

export interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Bypass YouTube's GDPR consent page (EU/PT region)
const CONSENT_COOKIE =
  "CONSENT=YES+cb.20210328-17-p0.en+FX+119; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpXzIwMjMwODI5LjA4X3AwGgJlbiABGgYIgLfCqAY";

export async function transcribeYouTube(youtubeUrl: string): Promise<{
  text: string;
  segments: TranscriptSegment[];
  videoId: string;
}> {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error(
      "URL do YouTube inválido. Usa um link no formato youtube.com/watch?v=... ou youtu.be/..."
    );
  }

  // 1. Fetch the YouTube watch page (with GDPR consent bypass)
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
      Cookie: CONSENT_COOKIE,
    },
  });

  if (!pageRes.ok) {
    throw new Error(
      `Não foi possível aceder ao YouTube (HTTP ${pageRes.status})`
    );
  }

  // Forward session cookies
  const setCookieHeader = pageRes.headers.get("set-cookie") ?? "";
  const sessionCookie = setCookieHeader
    ? `${CONSENT_COOKIE}; ${setCookieHeader
        .split(",")
        .map((c) => c.split(";")[0].trim())
        .join("; ")}`
    : CONSENT_COOKIE;

  const html = await pageRes.text();

  // 2. Extract ytInitialPlayerResponse using brace-counting (avoids regex truncation)
  const playerResponse = extractJsonFromHtml(html, "ytInitialPlayerResponse");
  if (!playerResponse) {
    throw new Error(
      "Não foi possível analisar a página do YouTube. Tenta novamente mais tarde."
    );
  }

  // 3. Extract caption tracks
  const captions = playerResponse?.captions as Record<string, unknown> | undefined;
  const tracklistRenderer = captions?.playerCaptionsTracklistRenderer as
    | Record<string, unknown>
    | undefined;
  const tracks = tracklistRenderer?.captionTracks as
    | Array<{ baseUrl: string; languageCode: string; kind?: string }>
    | undefined;

  if (!tracks || tracks.length === 0) {
    throw new Error(
      "Este vídeo não tem legendas disponíveis. Para importar um vídeo do YouTube, o vídeo tem de ter legendas manuais ativadas."
    );
  }

  // Log available tracks for debugging
  console.log(
    `[youtube-transcriber] videoId=${videoId} tracks:`,
    tracks.map((t) => `${t.languageCode}(${t.kind ?? "manual"})`).join(", ")
  );

  // 4. Filter out ASR (auto-generated) tracks — YouTube blocks server-side access to them.
  //    Only manual/human-curated captions are accessible programmatically.
  const manualTracks = tracks.filter((t) => t.kind !== "asr");

  if (manualTracks.length === 0) {
    throw new Error(
      "Este vídeo só tem legendas automáticas geradas pela IA do YouTube (ASR), " +
      "que não são acessíveis de forma programática. " +
      "Para importar este vídeo, o canal precisa de ter legendas manuais ativadas. " +
      "Alternativa: copia a transcrição manualmente em youtube.com/watch?v=" + videoId + " (ícone ⋮ → Abrir transcrição) e importa como ficheiro de texto."
    );
  }

  // 5. Order: pt → en → others (manual tracks only)
  const orderedTracks = [
    ...manualTracks.filter((t) => t.languageCode === "pt"),
    ...manualTracks.filter((t) => t.languageCode === "en"),
    ...manualTracks.filter((t) => t.languageCode !== "pt" && t.languageCode !== "en"),
  ];

  // 6. Try each manual track
  for (const track of orderedTracks) {
    // Ensure absolute URL
    const baseUrl = track.baseUrl.startsWith("//")
      ? `https:${track.baseUrl}`
      : track.baseUrl;

    if (!baseUrl) {
      console.warn(`[youtube-transcriber] empty baseUrl for lang=${track.languageCode}`);
      continue;
    }

    try {
      const segments = await fetchTrackSegments(baseUrl, track.languageCode, sessionCookie);
      if (segments.length > 0) {
        console.log(
          `[youtube-transcriber] success lang=${track.languageCode}, ${segments.length} segments`
        );
        return { text: groupTranscriptIntoParagraphs(segments), segments, videoId };
      }
    } catch (err) {
      console.warn(
        `[youtube-transcriber] track lang=${track.languageCode} failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  throw new Error(
    "Não foi possível obter a transcrição. As legendas podem estar num formato não suportado ou o acesso foi bloqueado pelo YouTube."
  );
}

/**
 * Extract a JSON object from HTML by finding the key assignment and using
 * brace-counting to capture the full object (avoids regex truncation).
 */
function extractJsonFromHtml(
  html: string,
  key: string
): Record<string, unknown> | null {
  const marker = `${key} =`;
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;

  const start = html.indexOf("{", markerIdx + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];

    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function fetchTrackSegments(
  baseUrl: string,
  langCode: string,
  cookie: string = CONSENT_COOKIE
): Promise<TranscriptSegment[]> {
  // Try json3 → srv3 → xml (no fmt = server default)
  const formats = ["json3", "srv3", "xml", ""] as const;

  for (const fmt of formats) {
    let url: string;
    if (fmt === "") {
      // Try without specifying format (server default)
      url = baseUrl.replace(/[&?]fmt=[^&]*/g, "");
    } else if (baseUrl.includes("fmt=")) {
      url = baseUrl.replace(/fmt=[^&]+/, `fmt=${fmt}`);
    } else {
      url = `${baseUrl}&fmt=${fmt}`;
    }

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Cookie: cookie },
      });
    } catch {
      continue;
    }

    if (!res.ok) continue;

    const body = await res.text();
    if (!body || body.trim().length === 0) {
      console.warn(
        `[youtube-transcriber] empty body lang=${langCode} fmt=${fmt || "default"}`
      );
      continue;
    }

    try {
      const segments = fmt === "json3" ? parseJson3(body) : parseXml(body);
      if (segments.length > 0) return segments;
    } catch (err) {
      console.warn(
        `[youtube-transcriber] parse error lang=${langCode} fmt=${fmt || "default"}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return [];
}

function parseJson3(body: string): TranscriptSegment[] {
  const data = JSON.parse(body) as {
    events?: Array<{
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8?: string }>;
    }>;
  };

  return (data.events ?? [])
    .filter((e) => e.segs && e.segs.length > 0)
    .map((e) => ({
      text: (e.segs ?? [])
        .map((s) => s.utf8 ?? "")
        .join("")
        .replace(/\n/g, " ")
        .trim(),
      duration: e.dDurationMs ?? 0,
      offset: e.tStartMs ?? 0,
    }))
    .filter((s) => s.text.length > 0);
}

function parseXml(body: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const re = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(body)) !== null) {
    const text = m[3]
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/<[^>]+>/g, "")
      .replace(/\n/g, " ")
      .trim();

    if (text) {
      segments.push({
        text,
        offset: Math.round(parseFloat(m[1]) * 1000),
        duration: Math.round(parseFloat(m[2]) * 1000),
      });
    }
  }

  return segments;
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function groupTranscriptIntoParagraphs(segments: TranscriptSegment[]): string {
  const PARAGRAPH_DURATION = 60_000;
  const paragraphs: string[] = [];
  let current: string[] = [];
  let currentStart = segments[0]?.offset ?? 0;

  for (const seg of segments) {
    current.push(seg.text);
    if (seg.offset - currentStart >= PARAGRAPH_DURATION) {
      paragraphs.push(current.join(" "));
      current = [];
      currentStart = seg.offset;
    }
  }

  if (current.length > 0) paragraphs.push(current.join(" "));
  return paragraphs.join("\n\n");
}
