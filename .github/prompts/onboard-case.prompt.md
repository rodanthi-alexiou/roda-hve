---
description: "Scaffolds a new bottleneck case in the cases/ catalog"
---

# Onboard Case

Adds a new SDLC bottleneck case to the case catalog.

## Inputs

* ${input:bottleneckName}: (Required) Short kebab-case name for the folder (e.g. `flaky-tests`)
* ${input:bottleneckTitle}: (Required) Human-readable title (e.g. "Flaky or Missing Tests")
* ${input:hveAnswer}: (Required) One-line summary of the HVE tools that solve this (e.g. "Test-generation agents + coverage KPIs")

## Steps

1. Create `cases/${input:bottleneckName}/README.md` by copying the template from `cases/_template/README.md`.
2. Replace the H1 heading with `# ${input:bottleneckTitle}`.
3. Fill the "HVE Answer" table with the tools the user describes — link to HVE Core or HVE Squad docs, do NOT duplicate content.
4. Add a row to the table in `cases/README.md`:

   ```markdown
   | ${input:bottleneckTitle} | ${input:hveAnswer} | In progress | [${input:bottleneckName}](${input:bottleneckName}/) |
   ```

5. Add a card to `docs/playbooks.html` inside the `cases-grid` div, following the existing card pattern:

   ```html
   <div class="card">
     <span class="pill">In progress</span>
     <h3>${input:bottleneckTitle}</h3>
     <p class="muted">${input:hveAnswer}</p>
     <a href="https://github.com/rodanthi-alexiou/roda-hve/tree/main/cases/${input:bottleneckName}" class="btn btn-secondary">View playbook →</a>
   </div>
   ```

6. Confirm completion and remind the user to fill in the remaining template sections (Engagement Model Mapping, Demo Script, Before/After, KPIs, Resources).
