import type { CrawlResult, SchemaIssue } from "./types";

export function analyzeTrustSignals(crawl: CrawlResult): {
  score: number;
  issues: SchemaIssue[];
} {
  const issues: SchemaIssue[] = [];
  let score = 0;
  const textLower = crawl.textContent.toLowerCase();
  const htmlLower = crawl.html.toLowerCase();

  // About page
  const hasAbout = crawl.links.some(l => l.href.includes("/about") || l.text.toLowerCase().includes("about"));
  if (hasAbout) { score += 12; } else {
    issues.push({ id: "trust-no-about", severity: "warning", pillar: "trust", title: "No About page link found", description: "An About page establishes organizational credibility.", fix: "Create an About page with company history, team, and mission." });
  }

  // Contact info
  const hasContact = crawl.links.some(l => l.href.includes("/contact") || l.text.toLowerCase().includes("contact"));
  const hasEmail = htmlLower.includes("mailto:") || /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(crawl.textContent);
  if (hasContact || hasEmail) { score += 12; } else {
    issues.push({ id: "trust-no-contact", severity: "warning", pillar: "trust", title: "No contact information found", description: "Contact details are key trust signals.", fix: "Add a Contact page or visible contact information." });
  }

  // Privacy policy
  const hasPrivacy = crawl.links.some(l => l.href.includes("privacy") || l.text.toLowerCase().includes("privacy"));
  if (hasPrivacy) { score += 10; } else {
    issues.push({ id: "trust-no-privacy", severity: "warning", pillar: "trust", title: "No privacy policy link found", description: "A privacy policy is a basic trust indicator.", fix: "Add a privacy policy page." });
  }

  // Terms
  const hasTerms = crawl.links.some(l => l.href.includes("terms") || l.text.toLowerCase().includes("terms"));
  if (hasTerms) { score += 8; } else {
    issues.push({ id: "trust-no-terms", severity: "info", pillar: "trust", title: "No terms of service link found", description: "Terms add legitimacy." });
  }

  // Author
  const hasAuthor = textLower.includes("author") || textLower.includes("written by") || htmlLower.includes('rel="author"');
  if (hasAuthor) { score += 12; } else {
    issues.push({ id: "trust-no-author", severity: "warning", pillar: "trust", title: "No author profiles detected", description: "Author profiles with credentials boost E-A-T.", fix: "Add author bios with expertise and social links." });
  }

  // Social links
  const socialDomains = ["twitter.com", "x.com", "linkedin.com", "facebook.com", "youtube.com", "github.com"];
  const socialCount = crawl.links.filter(l => socialDomains.some(s => l.href.includes(s))).length;
  if (socialCount >= 2) { score += 10; } else if (socialCount >= 1) { score += 5; } else {
    issues.push({ id: "trust-no-social", severity: "info", pillar: "trust", title: "No social media links found", description: "Social profiles strengthen authority.", fix: "Link to your official social media profiles." });
  }

  // HTTPS
  if (crawl.hasHttps) score += 8;

  // Copyright
  if (textLower.includes("©") || textLower.includes("copyright")) score += 5;

  // Address
  const hasAddr = textLower.includes("address") || textLower.includes("headquarter");
  if (hasAddr) { score += 8; } else {
    issues.push({ id: "trust-no-address", severity: "info", pillar: "trust", title: "No physical address detected", description: "A business address increases perceived legitimacy." });
  }

  // Testimonials
  if (textLower.includes("testimonial") || textLower.includes("review")) score += 5;

  return { score: Math.min(Math.round((score / 100) * 100), 100), issues };
}
