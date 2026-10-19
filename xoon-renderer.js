/**
 * XOON Browser Runtime & Semantic DOM Hydrator
 * Zero-dependency, client-side parser that translates XOON/TOON data into
 * accessible, responsive Semantic HTML5 elements.
 * 
 * Repository: https://github.com/rairahulr1/xoon
 * License: MIT
 */

function parseXoon(text) {
  const result = {
    _meta: {},
    _sections: {}
  };

  let currentSection = null;
  let currentFields = [];
  let currentType = null; // 'table', 'list', 'text', 'meta'

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for XML tag boundaries: <tag> or </tag>
    const openTagMatch = trimmed.match(/^<([a-zA-Z0-9_-]+)>$/);
    if (openTagMatch) {
      const tag = openTagMatch[1].toLowerCase();
      if (tag === 'metadata') {
        currentType = 'meta';
        currentSection = null;
      } else if (['dataset', 'records', 'context', 'document'].includes(tag)) {
        currentType = null;
        currentSection = null;
      } else {
        currentSection = tag;
        currentType = 'list';
        result._sections[currentSection] = {
          type: 'list',
          items: []
        };
      }
      continue;
    }

    const closeTagMatch = trimmed.match(/^<\/([a-zA-Z0-9_-]+)>$/);
    if (closeTagMatch) {
      currentSection = null;
      currentType = null;
      continue;
    }

    // Inside <metadata> block
    if (currentType === 'meta') {
      const kvMatch = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
      if (kvMatch) {
        result._meta[kvMatch[1]] = kvMatch[2];
      }
      continue;
    }

    // Check for tabular section header: name[count]{field1,field2,...}:
    const tableMatch = trimmed.match(/^([a-zA-Z0-9_-]+)(?:\[\d*\])?\{([^}]+)\}:?$/);
    if (tableMatch) {
      currentSection = tableMatch[1];
      currentFields = tableMatch[2].split(',').map(f => f.trim());
      currentType = 'table';
      result._sections[currentSection] = {
        type: 'table',
        fields: currentFields,
        rows: []
      };
      continue;
    }

    // Check for list section header: name[count]:
    const listMatch = trimmed.match(/^([a-zA-Z0-9_-]+)(?:\[\d*\])?:?$/);
    if (listMatch && !trimmed.includes(': ') && !trimmed.startsWith('- ')) {
      currentSection = listMatch[1];
      currentType = 'list';
      result._sections[currentSection] = {
        type: 'list',
        items: []
      };
      continue;
    }

    // Top-level key-value pair
    const kvMatch = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
    if (kvMatch && !rawLine.startsWith('  ') && !currentSection) {
      result._meta[kvMatch[1]] = kvMatch[2];
      currentType = null;
      continue;
    }

    // Parsing inside an active section
    if (currentSection && result._sections[currentSection]) {
      const sec = result._sections[currentSection];
      if (sec.type === 'table') {
        const cols = splitCsvRow(trimmed);
        const row = {};
        sec.fields.forEach((field, idx) => {
          row[field] = cols[idx] !== undefined ? cols[idx] : '';
        });
        sec.rows.push(row);
      } else if (sec.type === 'list') {
        const itemVal = trimmed.replace(/^[-*•]\s*/, '');
        sec.items.push(itemVal);
      } else if (sec.type === 'text') {
        sec.content.push(rawLine);
      }
    }
  }

  return result;
}

function splitCsvRow(str) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
      continue;
    }
    cur += char;
  }
  result.push(cur.trim());
  return result;
}

function formatInline(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/;(?=\s)/g, '<br>&bull; ');
}

function humanize(str) {
  return str
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

document.addEventListener('DOMContentLoaded', () => {
  const dataEl = document.getElementById('data') || document.querySelector('dataset') || document.querySelector('[type="text/xoon"]') || document.querySelector('[type="text/toon"]');
  const appEl = document.getElementById('app') || document.querySelector('main');
  if (!dataEl || !appEl) return;

  const rawText = dataEl.tagName.toLowerCase() === 'script'
    ? dataEl.textContent
    : dataEl.innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  
  const parsed = parseXoon(rawText);
  const meta = parsed._meta;
  const sections = parsed._sections;

  let html = '';

  // Render Metadata Bar if present
  const metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    html += '<header class="meta-bar" aria-label="Document Metadata">';
    metaKeys.forEach(k => {
      html += `<span class="meta-badge"><strong>${humanize(k)}:</strong> <data value="${meta[k]}">${formatInline(meta[k])}</data></span>`;
    });
    html += '</header>';
  }

  // Universal Semantic Section Renderer
  Object.keys(sections).forEach(key => {
    const sec = sections[key];
    const title = humanize(key);

    if (sec.type === 'table') {
      html += `<section class="xoon-section table-section" aria-labelledby="sec-${key}">
        <h2 id="sec-${key}">${title} <span class="badge">${sec.rows.length}</span></h2>
        <div class="table-wrapper">
          <table data-sortable="true">
            <thead>
              <tr>`;
      sec.fields.forEach(f => {
        html += `<th scope="col" tabindex="0" role="columnheader">${humanize(f)}</th>`;
      });
      html += `</tr>
            </thead>
            <tbody>`;
      sec.rows.forEach(r => {
        html += '<tr>';
        sec.fields.forEach(f => {
          const val = r[f] || '';
          html += `<td>${formatInline(val)}</td>`;
        });
        html += '</tr>';
      });
      html += `</tbody>
          </table>
        </div>
      </section>`;
    } else if (sec.type === 'list') {
      html += `<section class="xoon-section list-section" aria-labelledby="sec-${key}">
        <h2 id="sec-${key}">${title}</h2>
        <ul class="xoon-list">`;
      sec.items.forEach(it => {
        html += `<li>${formatInline(it)}</li>`;
      });
      html += `</ul>
      </section>`;
    }
  });

  appEl.innerHTML = html;

  // Add click-to-sort functionality to tables
  document.querySelectorAll('table[data-sortable="true"] th').forEach((th, idx) => {
    th.addEventListener('click', () => {
      const table = th.closest('table');
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const isAsc = th.classList.contains('sort-asc');

      table.querySelectorAll('th').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
      th.classList.toggle('sort-asc', !isAsc);
      th.classList.toggle('sort-desc', isAsc);

      rows.sort((a, b) => {
        const aText = a.children[idx].textContent.trim();
        const bText = b.children[idx].textContent.trim();
        const aNum = parseFloat(aText);
        const bNum = parseFloat(bText);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return isAsc ? bNum - aNum : aNum - bNum;
        }
        return isAsc ? bText.localeCompare(aText) : aText.localeCompare(bText);
      });

      rows.forEach(r => tbody.appendChild(r));
    });
  });
});
