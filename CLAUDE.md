# CLAUDE.md - Project Specification for Experimental Unit Worldview Mapper

## Section 1: User Profile

**Who is Adam Wadley?**
Adam is a concept and performance artist working on MUU (mixed, unclear, unstable) - a worldview framework that embraces complexity and ambiguity. He's an autodidact generalist working at the intersection of comparative mythology, philosophy, science, military design theory, and spiritual practice.

**Current activities:**
- Intervention work with the Transformation and Training Command in Austin
- Connections to Ben Zweibelson of Space Command (helping connect them with Kenneth Stanley)
- Engagement with cultural figures like Grimes (received a reply - big inspiration and target)
- Running Experimental Unit Substack with 887+ published posts spanning OSA tactical assessments, theoretical essays, podcasts, AI-mediated discussions, and experimental opera

**Technical comfort:** Has coded in Python a few times but doesn't keep up with tech. Can think logically but isn't interested in the technical weeds.

**Goals for this project (in plain language):**
1. Make his ideas more easily navigable for people who currently don't understand or see the utility
2. Create a tool that extracts propositions/beliefs from large text (like his entire blog)
3. Let him affirm, reject, or nuance each proposition to build his current worldview graph
4. Multiple visualization styles (network graphs, hierarchies, etc.)
5. Eventually power a personalized chatbot that combines his worldview with general knowledge
6. Make this tool work for everyone - tailoring experience based on initial conditions like chaos math

**How Adam prefers updates:**
- Show rough drafts of working features
- Text feedback
- Never show broken things or ask to verify technical functionality

**Constraints:**
- Budget: ~$500 for hosting/AI costs
- Privacy-respecting where possible (encrypted storage, ability to keep things private)
- Must integrate all 887 Substack posts as the first real test case

---

## Section 2: Communication Rules

- NEVER ask technical questions. Make the decision yourself as the expert.
- NEVER use jargon, technical terms, or code references when talking to Adam.
- Explain everything the way you'd explain it to a smart friend who doesn't work in tech.
- If you must reference something technical, immediately translate it.
  - Example: "the database" → "where your information is stored"
  - Example: "the API" → "the connection that lets different parts of the system talk to each other"

---

## Section 3: Decision-Making Authority

You have full authority over all technical decisions:
- Languages, frameworks, architecture, libraries
- Hosting, file structure, everything

**Technology philosophy:**
- Choose boring, reliable, well-supported technologies over cutting-edge options
- Optimize for maintainability and simplicity
- Document technical decisions in TECHNICAL.md (for future developers, not for Adam)

---

## Section 4: When to Involve Adam

Only bring decisions when they directly affect what he will see or experience.

**When asking, always:**
- Explain the tradeoff in plain language
- Tell him how each option affects his experience (speed, appearance, ease of use)
- Give your recommendation and why
- Make it easy to just say "go with your recommendation"

**Examples of when TO ask:**
- "This can load instantly but will look simpler, or look richer but take 2 seconds to load. Which matters more to you?"
- "I can make this work on phones too, but it will take an extra day. Worth it?"
- "The graph can show everything at once (might be overwhelming) or reveal layers as you explore (takes longer to see the full picture). Which feels right?"

**Examples of when NOT to ask:**
- Anything about databases, APIs, frameworks, languages, or architecture
- Library choices, dependency decisions, file organization
- How to implement any feature technically

---

## Section 5: Engineering Standards

Apply these automatically without discussion:
- Write clean, well-organized, maintainable code
- Implement automated testing where appropriate
- Build in self-verification - the system should check itself works correctly
- Handle errors gracefully with friendly, non-technical error messages
- Include input validation and security best practices
- Make it easy for a future developer to understand and modify
- Use version control with clear commit messages

---

## Section 6: Quality Assurance

- Test everything yourself before showing Adam
- Never show something broken or ask him to verify technical functionality
- If something isn't working, fix it - don't explain the technical problem
- When demonstrating progress, everything visible should work
- Build in automated checks that run before any changes go live

---

## Section 7: Showing Progress

- Show working demos whenever possible - let Adam click around and try things
- Use screenshots or screen recordings when demos aren't practical
- Describe changes in terms of what he'll experience, not what changed technically
- Celebrate milestones in terms he cares about:
  - "You can now paste in text and see propositions extracted"
  - "The graph now shows how your beliefs connect"
  - NOT: "Implemented NLP pipeline" or "Added D3 force-directed graph"

---

## Section 8: Project-Specific Details

### The Vision
A universal worldview mapping tool that adapts to whoever uses it (chaos math style - sensitive to initial conditions).

### Core Flow
1. **Import text** - Paste in large amounts of writing (entire blogs, journals, manifestos)
2. **Extract propositions** - AI identifies claims and beliefs in the text
3. **Start foundational** - Begin with the most basic/fundamental propositions first
4. **User feedback** - Allow affirm/reject/nuance (not just yes/no)
5. **Build graph** - Create a visual map of the person's worldview
6. **Multiple views** - Network diagrams, hierarchies, navigable web
7. **Chatbot integration** - The graph informs a personalized AI that knows your perspective

### Adam's Content (First Test Case)
- 887 Substack posts exported and available
- Rich philosophical content mixing:
  - Military design theory (Ben Zweibelson, systemic operational design)
  - Afropessimism and systemic oppression critique
  - Baudrillard's symbolic exchange and hyperreality
  - Perennial philosophy and religious syncretism
  - Personal/family narrative as political intervention
  - The "Experimental Unit" ARG concept
  - "Love love or die" as ethical imperative

### Visual Design
**Primary colors:** Orange, purple, forest green, grey, black
**Secondary colors:** Neon yellow, ocean blue, pink, white, red
**Feel:** Should adapt - the tool is general purpose

### Privacy & Data
- Users should be able to keep worldviews private
- Export functionality (share, save, backup)
- Mitigate surveillance state concerns where possible

### Future Features (Nice to Have)
- People building their own graphs in response to others
- Finding isomorphisms between different people's concept spaces
- Board game / phone game implementations
- VR memory palace exploration of worldviews
