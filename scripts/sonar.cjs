#!/usr/bin/env node

const { scan } = require("sonarqube-scanner");
const http = require("http");

const SONAR_URL = process.env.SONAR_URL || "http://localhost:9000";
const SONAR_TOKEN = process.env.SONAR_TOKEN;
const PROJECT_KEY = "new-compliance-copilot";
const PROJECT_NAME = "New Compliance Copilot";

if (!SONAR_TOKEN) {
  console.error(
    "SONAR_TOKEN env var is required. Generate a token in SonarQube → My Account → Security, then export SONAR_TOKEN before running `pnpm sonar`.",
  );
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeAuthHeader() {
  return `Bearer ${SONAR_TOKEN}`;
}

async function fetchResults() {
  const metrics = [
    "bugs",
    "vulnerabilities",
    "security_hotspots",
    "code_smells",
    "coverage",
    "duplicated_lines_density",
    "ncloc",
    "reliability_rating",
    "security_rating",
    "sqale_rating",
  ].join(",");

  const url = new URL(`${SONAR_URL}/api/measures/component`);
  url.searchParams.set("component", PROJECT_KEY);
  url.searchParams.set("metricKeys", metrics);

  return new Promise((resolve, reject) => {
    const req = http.get(
      url,
      { headers: { Authorization: makeAuthHeader() } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const measures = {};
            if (json.component?.measures) {
              for (const m of json.component.measures) {
                measures[m.metric] = m.value;
              }
            }
            resolve(measures);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
  });
}

async function fetchIssues() {
  const url = new URL(`${SONAR_URL}/api/issues/search`);
  url.searchParams.set("componentKeys", PROJECT_KEY);
  url.searchParams.set("ps", "100");
  url.searchParams.set("severities", "BLOCKER,CRITICAL,MAJOR");

  return new Promise((resolve, reject) => {
    const req = http.get(
      url,
      { headers: { Authorization: makeAuthHeader() } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.issues || []);
          } catch {
            resolve([]);
          }
        });
      },
    );
    req.on("error", reject);
  });
}

function ratingLabel(rating) {
  const labels = { "1.0": "A", "2.0": "B", "3.0": "C", "4.0": "D", "5.0": "E" };
  return labels[rating] || rating || "?";
}

async function main() {
  console.log(`=== SonarQube Scanner — ${PROJECT_NAME} ===\n`);
  console.log(`Server:   ${SONAR_URL}`);
  console.log(`Project:  ${PROJECT_KEY}`);
  console.log(`Token:    ${SONAR_TOKEN.slice(0, 8)}...\n`);

  console.log("Running scanner...\n");

  try {
    await new Promise((resolve, reject) => {
      scan(
        {
          serverUrl: SONAR_URL,
          token: SONAR_TOKEN,
          options: {
            "sonar.projectKey": PROJECT_KEY,
            "sonar.projectName": PROJECT_NAME,
            "sonar.sources": "app,pipeline,eval,ingest,corpus,scripts,shared",
            "sonar.tests": "tests",
            "sonar.exclusions":
              "**/node_modules/**,**/dist/**,**/.next/**,**/coverage/**,**/public/**,pnpm-lock.yaml,**/.scannerwork/**,**/test-results/**,**/.playwright-mcp/**",
            "sonar.sourceEncoding": "UTF-8",
            "sonar.javascript.node.maxspace": "8192",
          },
        },
        resolve,
        reject,
      );
    });
  } catch (err) {
    console.log(
      "Scanner reported an error, but results may still be available. Attempting to fetch...\n",
    );
  }

  console.log("Scanner finished. Waiting for SonarQube to process...\n");
  await sleep(8000);

  console.log("Fetching results...\n");

  try {
    const measures = await fetchResults();
    const issues = await fetchIssues();

    console.log("╔══════════════════════════════════════════╗");
    console.log("║     SONARQUBE ANALYSIS RESULTS          ║");
    console.log("╠══════════════════════════════════════════╣");
    console.log(
      `║ Lines of Code:      ${String(measures.ncloc || "N/A").padEnd(20)}║`,
    );
    console.log(
      `║ Bugs:               ${String(measures.bugs || "0").padEnd(20)}║`,
    );
    console.log(
      `║ Vulnerabilities:    ${String(measures.vulnerabilities || "0").padEnd(20)}║`,
    );
    console.log(
      `║ Security Hotspots:  ${String(measures.security_hotspots || "0").padEnd(20)}║`,
    );
    console.log(
      `║ Code Smells:        ${String(measures.code_smells || "0").padEnd(20)}║`,
    );
    console.log(
      `║ Coverage:           ${String((measures.coverage || "0") + "%").padEnd(20)}║`,
    );
    console.log(
      `║ Duplication:        ${String((measures.duplicated_lines_density || "0") + "%").padEnd(20)}║`,
    );
    console.log(
      `║ Reliability:        ${ratingLabel(measures.reliability_rating).padEnd(20)}║`,
    );
    console.log(
      `║ Security:           ${ratingLabel(measures.security_rating).padEnd(20)}║`,
    );
    console.log(
      `║ Maintainability:    ${ratingLabel(measures.sqale_rating).padEnd(20)}║`,
    );
    console.log("╚══════════════════════════════════════════╝");

    if (issues.length > 0) {
      console.log(
        `\n⚠  ${issues.length} issues with BLOCKER/CRITICAL/MAJOR severity:\n`,
      );
      for (const issue of issues.slice(0, 20)) {
        const severity = issue.severity || "?";
        const type = issue.type || "?";
        const msg = (issue.message || "").slice(0, 80);
        const file = issue.component || "";
        const line = issue.line || "";
        console.log(`  [${severity}] ${type}: ${msg}`);
        console.log(`    ${file}${line ? ":" + line : ""}\n`);
      }
      if (issues.length > 20) {
        console.log(
          `  ... and ${issues.length - 20} more. See ${SONAR_URL}/dashboard?id=${PROJECT_KEY}\n`,
        );
      }
    } else {
      console.log("\n✓ No BLOCKER/CRITICAL/MAJOR issues found.\n");
    }

    console.log(
      `Full dashboard: ${SONAR_URL}/dashboard?id=${PROJECT_KEY}\n`,
    );
  } catch (err) {
    console.error("Failed to fetch results:", err.message);
    console.log(
      `\nView manually at: ${SONAR_URL}/dashboard?id=${PROJECT_KEY}\n`,
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
