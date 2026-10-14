/**
 * Autocomplete Mining - Markdown & Export Utilities
 */

export const MarkdownExporter = {
  /**
   * Format mined data into structured Markdown
   * @param {Object} data
   * @param {string} data.keyword - Seed keyword
   * @param {string} data.platform - Google, Etsy, YouTube
   * @param {Object.<string, string[]>} data.resultsByLetter - Map of letter -> array of suggestions
   * @param {string[]} data.allUnique - Array of all unique suggestions
   * @param {string} [data.mode] - 'suffix' | 'prefix'
   * @returns {string} Markdown document string
   */
  generateMarkdown(data) {
    const {
      keyword = "",
      platform = "Search",
      resultsByLetter = {},
      allUnique = [],
      mode = "suffix"
    } = data;

    const dateStr = new Date().toLocaleString();
    const platformDisplay = platform.charAt(0).toUpperCase() + platform.slice(1);
    const sortedLetters = Object.keys(resultsByLetter).sort((a, b) => {
      if (a === "base") return -1;
      if (b === "base") return 1;
      return a.localeCompare(b);
    });

    let md = `# Autocomplete Mining: "${keyword}"\n\n`;
    md += `> Mined via **Autocomplete Mining** Chrome Extension\n\n`;
    md += `| Attribute | Details |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Platform** | ${platformDisplay} |\n`;
    md += `| **Seed Keyword** | \`${keyword}\` |\n`;
    md += `| **Mining Mode** | ${mode === "prefix" ? "Prefix (Letter + Keyword)" : "Suffix (Keyword + Letter)"} |\n`;
    md += `| **Date & Time** | ${dateStr} |\n`;
    md += `| **Total Unique Suggestions** | **${allUnique.length}** |\n`;
    md += `| **Categories Mined** | ${sortedLetters.length} sections |\n\n`;

    md += `---\n\n`;
    md += `## Table of Contents\n\n`;
    for (const letter of sortedLetters) {
      const label = letter === "base" ? "Base Query" : letter.toUpperCase();
      const count = resultsByLetter[letter]?.length || 0;
      const anchor = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      md += `- [${label} (${count})](#${anchor})\n`;
    }
    md += `- [All Unique Suggestions (${allUnique.length})](#all-unique-suggestions)\n\n`;

    md += `---\n\n`;

    // Individual sections
    for (const letter of sortedLetters) {
      const label = letter === "base" ? "Base Query" : letter.toUpperCase();
      const list = resultsByLetter[letter] || [];
      md += `## ${label}\n\n`;
      if (list.length === 0) {
        md += `_No suggestions found._\n\n`;
      } else {
        for (const item of list) {
          md += `- ${item}\n`;
        }
        md += `\n`;
      }
    }

    // Consolidated list
    md += `---\n\n`;
    md += `## All Unique Suggestions\n\n`;
    md += `Total: **${allUnique.length}** unique terms\n\n`;
    const sortedAll = [...allUnique].sort((a, b) => a.localeCompare(b));
    sortedAll.forEach((item, index) => {
      md += `${index + 1}. ${item}\n`;
    });
    md += `\n`;

    return md;
  },

  /**
   * Generate CSV content
   */
  generateCSV(data) {
    const {
      keyword = "",
      platform = "Search",
      resultsByLetter = {},
      allUnique = []
    } = data;

    const escapeCsv = (str) => `"${String(str).replace(/"/g, '""')}"`;
    const rows = [
      ["Platform", "Seed Keyword", "Section", "Suggestion"]
    ];

    const sortedLetters = Object.keys(resultsByLetter).sort((a, b) => {
      if (a === "base") return -1;
      if (b === "base") return 1;
      return a.localeCompare(b);
    });

    for (const letter of sortedLetters) {
      const section = letter === "base" ? "Base" : letter.toUpperCase();
      const list = resultsByLetter[letter] || [];
      for (const item of list) {
        rows.push([platform, keyword, section, item]);
      }
    }

    return rows.map(r => r.map(escapeCsv).join(",")).join("\r\n");
  },

  /**
   * Plain text list (one suggestion per line)
   */
  generatePlainText(allUnique = []) {
    return [...allUnique].sort((a, b) => a.localeCompare(b)).join("\n");
  }
};
