export function Paragraph({ text, muted=true }: { text: string, muted?: boolean }) {
  return (
    <p className={`leading-7 ${muted ? "text-muted-foreground" : ""}`}>
      {text}
    </p>
  )
}
