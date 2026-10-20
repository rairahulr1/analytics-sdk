// Universal TOON Browser Parser & Renderer
function parseToon(text) {
  const result = {
    _meta: {},
    _sections: {}
  };
  
  let currentSection = null;
  let currentFields = [];
  let currentType = null; // 'table', 'list', 'text'
  
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
      } else if (tag === 'records' || tag === 'context' || tag === 'dataset') {
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
    const listMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\[\d*\]:?$/);
    if (listMatch) {
      currentSection = listMatch[1];
      currentType = 'list';
      result._sections[currentSection] = {
        type: 'list',
        items: []
      };
      continue;
    }

    // Check for generic block header: name:
    const blockMatch = trimmed.match(/^([a-zA-Z0-9_-]+):$/);
    if (blockMatch) {
      currentSection = blockMatch[1];
      currentType = 'text';
      result._sections[currentSection] = {
        type: 'text',
        content: []
      };
      continue;
    }
    
    // Check for top-level key-value pair if no section or at root: key: value
    const kvMatch = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
    if (kvMatch && !rawLine.startsWith('  ') && !rawLine.startsWith('\t')) {
      const k = kvMatch[1];
      const v = kvMatch[2];
      result._meta[k] = v;
      currentSection = null;
      currentType = null;
      continue;
    }
    
    // Parsing inside an active section
    if (currentSection && result._sections[currentSection]) {
      const sec = result._sections[currentSection];
      if (sec.type === 'table') {
        // CSV-style row inside table
        // Split on comma, respecting quotes or brackets
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
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
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
  const dataEl = document.getElementById('data');
  const appEl = document.getElementById('app');
  if (!dataEl || !appEl) return;
  
  const rawText = dataEl.tagName.toLowerCase() === 'script' 
    ? dataEl.textContent 
    : dataEl.innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const parsed = parseToon(rawText);
  const meta = parsed._meta;
  const sections = parsed._sections;
  let html = '';
  
  // Custom-renderer opt-in. A page that needs behaviour this file does not have
  // (search / filter / sort) declares a handler and is handed the parse result
  // instead of the static markup below. Strictly additive: no generated page
  // declares #renderer today, so every existing page takes the original path.
  const rendererHook = document.getElementById('renderer');
  if (rendererHook && typeof window.renderToonPage === 'function') {
    try {
      window.renderToonPage({ meta: meta, sections: sections, appEl: appEl });
      return;
    } catch (err) {
      console.error('Custom TOON renderer failed; falling back to the built-in renderer.', err);
    }
  }
  
  // Render Metadata Bar
  const metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    html += '<div class="meta-bar">';
    metaKeys.forEach(k => {
      html += `<span class="meta-badge"><strong>${humanize(k)}:</strong> ${formatInline(meta[k])}</span>`;
    });
    html += '</div>';
  }
  
  const handled = new Set();
  
  // Render Rules Alert Box if present
  if (sections.rules) {
    handled.add('rules');
    html += '<div class="note-box alert-warn" style="margin: 14px 0 20px 0;"><h3 style="color: var(--accent-amber); margin-top: 0;">Operational Rules &amp; Verification Constraints</h3><ul>';
    sections.rules.items.forEach(r => {
      html += `<li>${formatInline(r)}</li>`;
    });
    html += '</ul></div>';
  }
  
  if (sections.startups || sections.giants) {
    if (sections.startups) {
      handled.add('startups');
      html += '<h2>Category A: Product Startups & High-Growth Scaleups</h2><div class="card-grid">';
      sections.startups.rows.forEach(c => {
        const tags = (c.stack || '').split('|').map(t => `<span class="tag">${t}</span>`).join('');
        html += `<article class="card">
          <h3>${formatInline(c.name)}</h3>
          <p><strong>Hub:</strong> ${c.hub} | <strong>Tier:</strong> ${c.tier}</p>
          <p><strong>Domain:</strong> ${c.domain}</p>
          <p><strong>Stack Evidence:</strong> ${formatInline(c.verification || '')}</p>
          <div>${tags}</div>
        </article>`;
      });
      html += '</div>';
    }
    if (sections.giants) {
      handled.add('giants');
      html += '<h2>Category B: Scaled Product Giants & Domain Registries</h2><div class="card-grid">';
      sections.giants.rows.forEach(c => {
        const tags = (c.stack || '').split('|').map(t => `<span class="tag">${t}</span>`).join('');
        html += `<article class="card">
          <h3>${formatInline(c.name)}</h3>
          <p><strong>Hub:</strong> ${c.hub} | <strong>Tier:</strong> ${c.tier}</p>
          <p><strong>Domain:</strong> ${c.domain}</p>
          <p><strong>Stack Evidence:</strong> ${formatInline(c.verification || '')}</p>
          <div>${tags}</div>
        </article>`;
      });
      html += '</div>';
    }
    if (sections.clusters) {
      handled.add('clusters');
      html += '<h2>Geographic Clusters Matrix</h2><div class="table-wrapper"><table><thead><tr><th>Hub Corridor</th><th>Transit Points</th><th>Companies</th><th>Optimal Time</th></tr></thead><tbody>';
      sections.clusters.rows.forEach(cl => {
        html += `<tr><td><strong>${cl.corridor}</strong></td><td>${cl.transit}</td><td>${cl.companies ? cl.companies.replace(/\|/g, ', ') : ''}</td><td>${cl.optimal_time}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }
  }

  // Specialized Part 2: Products & Sprint
  if (sections.products || sections.sprint) {
    if (sections.products) {
      handled.add('products');
      html += '<h2>Flagship Proof-of-Work Products</h2>';
      sections.products.rows.forEach(p => {
        html += `<article class="card ${p.theme || ''}">
          <h3>${formatInline(p.name)}</h3>
          <p><strong>Target Companies:</strong> ${p.target ? p.target.replace(/\|/g, ', ') : ''}</p>
          <p><strong>Problem Solved:</strong> ${formatInline(p.problem)}</p>
          <h4>Architecture</h4>
          <p>${formatInline(p.arch)}</p>
          <h4>Tech Stack & Benchmarks</h4>
          <p><strong>Stack:</strong> ${p.stack ? p.stack.replace(/\|/g, ' &bull; ') : ''}</p>
          <p><strong>Benchmark:</strong> ${formatInline(p.bench)}</p>
        </article>`;
      });
    }
    if (sections.sprint) {
      handled.add('sprint');
      html += '<h2>30-Day Engineering Sprint Cadence</h2><div class="table-wrapper"><table><thead><tr><th>Timeline</th><th>Focus</th><th>Deliverables</th><th>Visibility Output</th></tr></thead><tbody>';
      sections.sprint.rows.forEach(s => {
        html += `<tr><td><strong>${s.week}</strong></td><td>${s.focus}</td><td>${s.deliverables}</td><td>${s.visibility}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }
  }

  // Specialized Part 3: Playbooks, Timing, Scripts
  if (sections.playbooks || sections.timing || sections.scripts) {
    if (sections.playbooks) {
      handled.add('playbooks');
      html += '<h2>Offline Infiltration Playbooks</h2>';
      sections.playbooks.rows.forEach(pb => {
        html += `<article class="card">
          <h3>${formatInline(pb.title)}</h3>
          <p><strong>Applies to:</strong> ${pb.applies_to}</p>
          <p>${formatInline(pb.tactic)}</p>
        </article>`;
      });
    }
    if (sections.timing) {
      handled.add('timing');
      html += '<h2>Mumbai Tech Timing Matrix</h2><div class="table-wrapper"><table><thead><tr><th>Day</th><th>Receptivity</th><th>Operational Context</th></tr></thead><tbody>';
      sections.timing.rows.forEach(t => {
        html += `<tr><td><strong>${t.day}</strong></td><td>${t.receptivity}</td><td>${t.context}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }
    if (sections.scripts) {
      handled.add('scripts');
      html += '<h2>Direct Outreach Scripts</h2>';
      sections.scripts.rows.forEach(sc => {
        html += `<h3>${formatInline(sc.target)}</h3><div class="script-box"><strong>Subject:</strong> ${formatInline(sc.subject)}\n\n${formatInline((sc.body || '').replace(/\\n/g, '\n'))}</div>`;
      });
    }
  }

  // Specialized Part 4: Components, Event Schema, Checklist
  if (sections.components || sections.event_schema || sections.checklist) {
    if (sections.components) {
      handled.add('components');
      html += '<h2>System Scope & Core Deliverables</h2><div class="card-grid">';
      sections.components.rows.forEach(cp => {
        html += `<article class="card">
          <h3>${formatInline(cp.name)}</h3>
          <p><strong>Role:</strong> ${cp.role}</p>
          <p><strong>Stack:</strong> <code>${cp.stack}</code></p>
          <p><strong>Deliverables:</strong> ${formatInline((cp.deliverables || '').replace(/;/g, ' &bull; '))}</p>
        </article>`;
      });
      html += '</div>';
    }
    if (sections.event_schema) {
      handled.add('event_schema');
      html += '<h2>Data Contract: Event Database Schema</h2><div class="table-wrapper"><table><thead><tr><th>Column</th><th>Data Type</th><th>Indexing</th><th>Description</th></tr></thead><tbody>';
      sections.event_schema.rows.forEach(es => {
        html += `<tr><td><code>${es.column}</code></td><td>${es.type}</td><td><strong>${es.index}</strong></td><td>${formatInline(es.description)}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }
    if (sections.checklist) {
      handled.add('checklist');
      html += '<h2>Submission Deliverables & Requirements</h2><div class="table-wrapper"><table><thead><tr><th>#</th><th>Deliverable</th><th>Requirement & Verification</th></tr></thead><tbody>';
      sections.checklist.rows.forEach(ck => {
        html += `<tr><td>${ck.step || ''}</td><td><strong>${formatInline(ck.title)}</strong></td><td>${formatInline(ck.requirement || '')}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }
  }

  // Universal Generic Renderer for any other sections
  Object.keys(sections).forEach(key => {
    if (handled.has(key)) return;
    const sec = sections[key];
    const title = humanize(key);
    
    if (sec.type === 'table') {
      html += `<h2>${title}</h2>`;
      html += '<div class="table-wrapper"><table><thead><tr>';
      sec.fields.forEach(f => {
        html += `<th>${humanize(f)}</th>`;
      });
      html += '</tr></thead><tbody>';
      sec.rows.forEach(r => {
        html += '<tr>';
        sec.fields.forEach(f => {
          html += `<td>${formatInline(r[f] || '')}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    } else if (sec.type === 'list') {
      html += `<h2>${title}</h2><ul>`;
      sec.items.forEach(it => {
        html += `<li>${formatInline(it)}</li>`;
      });
      html += '</ul>';
    } else if (sec.type === 'text') {
      html += `<h2>${title}</h2>`;
      const textContent = sec.content.join('\n').trim();
      if (textContent.startsWith('```') && textContent.endsWith('```')) {
        const code = textContent.replace(/^```[a-z]*\n?/, '').replace(/```$/, '');
        html += `<pre><code>${formatInline(code)}</code></pre>`;
      } else {
        html += `<div class="note-box">${formatInline(textContent)}</div>`;
      }
    }
  });

  appEl.innerHTML = html;
});
