import type { ObligationValidation } from "../lib/types"

interface Props {
  quote: string
  page: number | null
  clauseId: string
  quality?: ObligationValidation["quality"] | null
}

const qualityStyle: Record<string, {
  bg: string
  text: string
}> = {
  high: { bg: "#F0FFF0", text: "#2D8A4E" },
  medium: { bg: "#FFF8E1", text: "#C17B00" },
  low: { bg: "#FFF3F0", text: "#C13B2A" },
}

/** Source-first citation: every obligation renders its verbatim quote + page. */
export default function SourceCitation({
  quote,
  page,
  clauseId,
  quality,
}: Props) {
  const q = quality ? qualityStyle[quality] : null
  return (
    <div
      data-testid="source-citation"
      style={{
        background: "var(--line-soft)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          data-testid="citation-clause"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--ink)",
            fontFamily: "Inter, monospace",
          }}
        >
          {clauseId}
        </span>
        <span
          data-testid="citation-page"
          style={{
            fontSize: 11,
            color: "var(--slate)",
            fontFamily: "Inter, monospace",
            background: "var(--card)",
            border: "1px solid var(--line)",
            padding: "1px 8px",
            borderRadius: 10,
          }}
        >
          {page != null ? `p. ${page}` : "page unknown"}
        </span>
        {q && quality && (
          <span
            data-testid="extraction-quality"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: q.text,
              background: q.bg,
              padding: "2px 8px",
              borderRadius: 20,
              fontFamily: "Inter",
            }}
          >
            extraction: {quality}
          </span>
        )}
      </div>
      <blockquote
        data-testid="citation-quote"
        style={{
          fontSize: 12,
          color: "var(--ink)",
          margin: 0,
          fontFamily: "Inter",
          lineHeight: 1.6,
          borderLeft: "3px solid var(--teal)",
          paddingLeft: 10,
          fontStyle: "italic",
        }}
      >
        “{quote}”
      </blockquote>
    </div>
  )
}
