import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const MAX_BYTES = 2 * 1024 * 1024;
export class AuditFetchError extends Error {}

export function decodeHtml(buffer: Buffer, contentType: string): string {
  const headerCharset = contentType.match(
    /charset\s*=\s*["']?([^\s;"']+)/i,
  )?.[1];
  const metaCharset = buffer
    .subarray(0, 1_024)
    .toString("ascii")
    .match(/<meta\b[^>]*charset\s*=\s*["']?([^\s;"'/>]+)/i)?.[1];
  try {
    return new TextDecoder(headerCharset || metaCharset || "utf-8").decode(
      buffer,
    );
  } catch {
    throw new AuditFetchError(
      "This page uses an unsupported character encoding. Use the extension to inspect the correctly rendered page.",
    );
  }
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (family === 6) {
    const [first, second] = address
      .toLowerCase()
      .split(":")
      .map((part) => Number.parseInt(part || "0", 16));
    // Only global unicast; reject transition, documentation, and protocol ranges.
    return (
      (first & 0xe000) === 0x2000 &&
      !(first === 0x2001 && (second <= 0x1ff || second === 0xdb8)) &&
      first !== 0x2002 &&
      first !== 0x3fff
    );
  }
  return false;
}

export function normalizePublicUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`,
    );
  } catch {
    throw new AuditFetchError("Enter a valid public website address.");
  }
  if (
    !/^(https?:)$/.test(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    url.href.length > 2_048
  )
    throw new AuditFetchError(
      "Use a public HTTP or HTTPS address without credentials or a custom port.",
    );
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    /\.(localhost|local|internal|test|invalid)$/.test(host) ||
    (!isIP(host) && !host.includes(".")) ||
    (isIP(host) && !isPublicAddress(host))
  )
    throw new AuditFetchError(
      "Local and private network addresses cannot be scanned. Use the extension for pages already open in your browser.",
    );
  url.hash = "";
  return url;
}

export async function fetchPublicHtml(
  value: string,
  signal?: AbortSignal,
): Promise<{ html: string; url: string; statusCode: number; robots: string }> {
  let url = normalizePublicUrl(value);
  const timeout = AbortSignal.timeout(18_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  for (let redirects = 0; redirects <= 4; redirects++) {
    combined.throwIfAborted();
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await lookup(host, { all: true });
    if (
      !addresses.length ||
      addresses.some((entry) => !isPublicAddress(entry.address))
    )
      throw new AuditFetchError(
        "This address resolves to a private or reserved network and cannot be fetched.",
      );
    combined.throwIfAborted();
    const target = addresses[0];
    const response = await new Promise<{
      status: number;
      location?: string;
      html: string;
      robots: string;
    }>((resolve, reject) => {
      const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
      const req = transport(
        url,
        {
          signal: combined,
          headers: {
            "User-Agent": "AuditAI-Pip/1.0 (public page SEO audit)",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Encoding": "identity",
          },
          // DNS is validated once, then pinned on this connection to prevent rebinding.
          lookup: (_hostname, options, callback) => {
            if (options.all)
              callback(null, [
                { address: target.address, family: target.family },
              ]);
            else callback(null, target.address, target.family);
          },
        },
        (res) => {
          const status = res.statusCode || 0;
          if (
            [301, 302, 303, 307, 308].includes(status) &&
            res.headers.location
          ) {
            res.destroy();
            resolve({
              status,
              location: res.headers.location,
              html: "",
              robots: "",
            });
            return;
          }
          if (
            !/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(
              res.headers["content-type"] || "",
            )
          ) {
            res.destroy();
            reject(
              new AuditFetchError(
                "The address did not return an HTML page. Open a public webpage to audit.",
              ),
            );
            return;
          }
          if (
            res.headers["content-encoding"] &&
            res.headers["content-encoding"] !== "identity"
          ) {
            res.destroy();
            reject(
              new AuditFetchError(
                "The site returned an unsupported compressed response. Try the extension on the loaded page.",
              ),
            );
            return;
          }
          let size = 0;
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_BYTES) {
              res.destroy();
              reject(
                new AuditFetchError(
                  "This HTML page exceeds the 2 MB scan limit. Use the extension to inspect the loaded page.",
                ),
              );
            } else chunks.push(chunk);
          });
          res.on("end", () => {
            const raw = res.headers["x-robots-tag"];
            try {
              resolve({
                status,
                html: decodeHtml(
                  Buffer.concat(chunks),
                  res.headers["content-type"] || "",
                ),
                robots: Array.isArray(raw) ? raw.join(", ") : raw || "",
              });
            } catch (error) {
              reject(error);
            }
          });
          res.on("error", reject);
        },
      );
      req.setTimeout(12_000, () =>
        req.destroy(
          new AuditFetchError(
            "The site took too long to respond. Try again or use the extension.",
          ),
        ),
      );
      req.on("error", reject);
      req.end();
    });
    if (response.location) {
      url = normalizePublicUrl(new URL(response.location, url).href);
      continue;
    }
    if (
      [401, 403, 429, 503].includes(response.status) ||
      /<title[^>]*>\s*(just a moment|attention required|access denied|verify you are human)/i.test(
        response.html,
      )
    )
      throw new AuditFetchError(
        `The site blocked or challenged this request (HTTP ${response.status}). Use the extension after loading the page normally.`,
      );
    return {
      html: response.html,
      url: url.href,
      statusCode: response.status,
      robots: response.robots,
    };
  }
  throw new AuditFetchError(
    "Too many redirects. Use the page's final public address.",
  );
}
