/**
 * YouTube transcript extractor using youtube-transcript.
 */

export interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
}

export async function transcribeYouTube(youtubeUrl: string): Promise<{
  text: string;
  segments: TranscriptSegment[];
  videoId: string;
}> {
  const { YoutubeTranscript } = await import("youtube-transcript");

  // Extract video ID from URL
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error(`Invalid YouTube URL: ${youtubeUrl}`);
  }

  // Try Portuguese first, then English
  let transcript: TranscriptSegment[] = [];
  let tried = false;

  for (const lang of ["pt", "en", ""]) {
    try {
      const raw = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: lang || undefined,
      });
      transcript = raw.map((item) => ({
        text: item.text,
        duration: item.duration,
        offset: item.offset,
      }));
      tried = true;
      break;
    } catch {
      continue;
    }
  }

  if (!tried || transcript.length === 0) {
    throw new Error(`No transcript available for video: ${videoId}`);
  }

  // Join segments into readable text with paragraph breaks
  const text = groupTranscriptIntoParagraphs(transcript);

  return { text, segments: transcript, videoId };
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function groupTranscriptIntoParagraphs(
  segments: TranscriptSegment[]
): string {
  // Group segments into ~60-second paragraphs
  const PARAGRAPH_DURATION = 60000; // ms

  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  let currentStart = segments[0]?.offset ?? 0;

  for (const segment of segments) {
    currentParagraph.push(segment.text);

    if (segment.offset - currentStart >= PARAGRAPH_DURATION) {
      paragraphs.push(currentParagraph.join(" "));
      currentParagraph = [];
      currentStart = segment.offset;
    }
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(" "));
  }

  return paragraphs.join("\n\n");
}
