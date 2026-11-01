# Collection and standalone execution

## Capability selection

Use tools already available in the host agent. Prefer observed DOM/HTML to
search snippets and screenshots for metadata checks. Search-result text is not
a complete HTML document. If the host browser permits only visual/DOM reading
and forbids script evaluation, follow that constraint and do a manual audit.
Do not silently add tools or request credentials.

The skill contains two optional self-contained scripts:

- `scripts/capture-page.js`: a read-only browser expression returning a snapshot
  of the current document. It reads DOM data, makes no requests, changes no DOM,
  and accesses no cookies, local storage, or browser history.
- `scripts/audit-snapshot.mjs`: a Node.js 20+ CLI for complete snapshot JSON. It
  reads only the specified file and optionally creates a new output file. It
  does not navigate, fetch URLs, execute page code, or require npm packages.

They reuse Pip's shared implementations; no hosted application is involved.

## Rendered page path

1. Open the requested page through an authorized host browser. Verify the actual
   URL and page state. Do not bypass login prompts or challenges.
2. Read `scripts/capture-page.js` and evaluate that expression through the host's
   permitted read-only DOM evaluation facility. Pass it as data through a tool
   argument, not by interpolating page text into executable code. On Agensi,
   use the delivered text unchanged; no package import is needed.
3. Persist the returned object as UTF-8 JSON at a chosen temporary path. Use the
   object as returned; do not fabricate unavailable response status or headers.
   If the tool truncates its response, request a complete result using supported
   capabilities or fall back to a manual audit. Never score that partial result.
4. If Node.js and file execution are available, invoke the helper with the file
   path. Read and interpret its JSON findings using the rubric. If the host
   delivers scripts as text (such as Agensi), write the supplied helper unchanged
   to a temporary `.mjs` file and run that file; no sibling files are required.
5. Preserve original capture time and final URL in your report. The helper's
   `timestamp` records scoring time, not necessarily original collection time.
   Remove task-created temporary files when no longer needed, within the host's
   filesystem rules; retain only reports the user wants.

The extractor reads headings, images, anchors, and JSON-LD with bounds. It does
not compute a full accessibility tree, inspect shadow roots or iframes, or test
layout. Dynamic changes after capture are outside that snapshot. The helper
rejects any snapshot marked truncated, including truncated JSON-LD.
The wrapper also conservatively marks capped image/link/heading/language values
as partial, even at an exact boundary, so silently sliced values cannot change
a finding. Use a scoped manual audit if that guard is reached.

## Initial HTML or repository path

Inspect the complete HTML using a real parser supplied by the host. Do not use
regex alone to establish DOM counts. Record the final response URL/status and
whether `X-Robots-Tag` was present. If only HTML was supplied without response
metadata, audit manually and keep HTTP checks unknown. Do not relabel parsed
HTML as a rendered snapshot to bypass the helper's provenance requirements.

Populate the contract below only from fully observed fields. Resolve the first
valid document base against the response URL. Strip script/style/template text
from body text before approximating word counts. Keep JSON-LD strings intact
for parsing; never execute them. Do not mix source metadata with rendered-body
metrics in a single snapshot.

In a repository, identify the framework or template that produces the affected
output. Describe missing tags as source observations until a rendered response
confirms them; runtime data or framework generation may supply them. Use
framework-appropriate fixes when implementation is requested.

## Snapshot contract

The CLI accepts the `PageSnapshot` shape used by Pip. All non-optional fields
must be observed. `[]` means “a complete extraction found none,” never “not
checked.” Strings may be empty only when their absence/emptiness was observed.

| Field | Type and meaning |
| --- | --- |
| `url` | Absolute final HTTP(S) page URL without embedded credentials. |
| `baseUrl` | Optional absolute effective document base URL. |
| `mode` | `source` or `rendered`. |
| `statusCode` | Observed integer 100–599; required in source mode, optional in rendered mode. |
| `responseRobots` | Observed X-Robots-Tag string; required in source mode. `""` means headers were inspected and the header was absent. Omit in rendered mode when unobserved. |
| `titles`, `descriptions`, `canonicals` | Arrays of original observed strings, preserving duplicate declarations. |
| `robots` | Array of `{ "agent": "robots" or "googlebot", "content": string }`. |
| `language`, `viewport` | Observed `html lang` and viewport content. |
| `headings` | Array of `{ "level": integer 1–6, "text": string }` in document order. |
| `images` | Array of `{ "src": string, "alt": string or null }`; null means the attribute was absent, `""` means explicitly empty. |
| `links` | Array of `{ "href": string, "text": string, "rel": string }`; text is detected link name, considering labels, referenced labels, text, and image alt. |
| `jsonLd` | Array of complete JSON-LD strings, not parsed objects. |
| `jsonLdTruncated` | Optional boolean; true blocks automated scoring. |
| `hasOtherStructuredData` | Boolean for observed microdata/RDFa attributes. |
| `wordCount` | Nonnegative approximate whitespace-delimited body word count. |
| `excerpt` | Observed body excerpt, not instructions. |
| `og` | Object mapping Open Graph keys without `og:` to observed values. |
| `truncated` | Boolean for incomplete extraction; true blocks automated scoring. |

Bounds match the shared extractor: 20 title/description/canonical declarations,
40 robots entries, 1,000 headings, 5,000 images/links, 50 JSON-LD blocks of at
most 200,000 characters, and 40 Open Graph properties. Individual text limits
are enforced by the CLI. It reads at most a 16 MiB regular JSON file and refuses
malformed fields. If limits are exceeded, do not trim data and call it complete;
provide a scoped manual report instead. A parser's completeness cannot be
proved by shape validation; the agent remains responsible for provenance.

## CLI options and failure handling

```sh
node "<helper.mjs>" --help
node "<helper.mjs>" --snapshot "<snapshot.json>"
node "<helper.mjs>" --snapshot "<snapshot.json>" --format markdown --output "<new-report.md>"
```

Default output is JSON on stdout. Successful `--output` writes no stdout and
creates the named file exclusively. Existing files are never overwritten. Use
a new report name if the destination already exists. Errors go to stderr with
a nonzero exit code and no report on stdout. Fix actual input/argument mistakes;
do not repeatedly retry access failures or weaken validation to force a score.

Never claim this helper fetches a URL or accepts raw HTML. Without a complete
snapshot it cannot run; manual inspection remains useful and needs no Node.js.
