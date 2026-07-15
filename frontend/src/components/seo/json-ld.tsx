/**
 * Renders one or more JSON-LD structured-data blocks. Server component friendly.
 * Pass a single schema object or an array; each is emitted as its own script.
 */
export function JsonLd({ schema }: { schema: object | object[] }) {
  const blocks = Array.isArray(schema) ? schema : [schema];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Structured data is trusted, build-time content (no user input).
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
