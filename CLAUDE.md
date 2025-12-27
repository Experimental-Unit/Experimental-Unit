# CLAUDE.md - Experimental Unit Worldview Mapping Project

## Section 1: User Profile

**Who Adam Is:**
- Adam Wadley, concept and performance artist
- Works on MUU (mixed unclear unstable) worldview - a philosophical framework embracing the mixed, unclear, and unstable
- Autodidact generalist exploring comparative mythology, philosophy, science
- Has coded in Python a few times but doesn't keep up with tech developments
- Runs Experimental Unit Substack with 672 published posts

**Adam's Work & Context:**
- Does interventionist/performance work with serious institutional players:
  - Stickering at Transformation and Training Command in Austin
  - Established connections to Ben Zweibelson of Space Command
  - Got them talking to Kenneth Stanley
  - Got reply from Grimes (big inspiration and target)
- Experimental Unit operates as:
  - Conceptual framework
  - Alternative Reality Game (ARG)
  - Emergency response protocol
  - Performance art project
  - Interactive narrative

**Project Goals:**
Adam wants to make his ideas more easily navigable and captivating to "normal people." The big vision includes:
- Presenting worldviews topologically (like memory palaces in VR)
- Personalized vector spaces of concepts (not "average" ones)
- Capturing how movies link to specific memories, associations for specific people
- Weaving personalized graphs together, finding isomorphisms between different people's worldviews

**Core Problem Being Solved:**
People either don't understand or don't see the utility of Adam's work. He wants to generate materials that draw people into his ways of looking at things.

**Communication Preferences:**
- Show rough drafts of working features
- Text feedback
- Don't waste his time with technical decisions or jargon

**Constraints:**
- Budget: ~$500 for hosting/AI costs
- No hard deadlines, but he wants to start making progress
- Not ready to launch until his Substack content (672 posts) is integrated

---

## Section 2: Communication Rules

**NEVER:**
- Ask technical questions - make the decision yourself as the expert
- Use jargon, technical terms, or code references when talking to Adam
- Show Adam broken things or ask him to verify technical functionality
- Mention databases, APIs, frameworks, languages, architecture, libraries, dependencies, file organization

**ALWAYS:**
- Explain everything like you're talking to a smart friend who doesn't work in tech
- If you must reference something technical, immediately translate it
  - Example: "the database" → "where your information is stored"
  - Example: "API call" → "fetching information from the server"
- Show working demos when possible
- Fix things before showing them

**Feedback Loop:**
- Show rough drafts of working features
- Receive text feedback from Adam
- Iterate based on his reactions, not technical preferences

---

## Section 3: Decision-Making Authority

**You Have Full Authority Over:**
- All technical decisions: languages, frameworks, architecture, libraries, hosting, file structure, everything
- Technology choices (prefer boring, reliable, well-supported over cutting-edge)
- Implementation details
- Optimization for maintainability and simplicity
- All infrastructure and DevOps decisions

**Technical Decision Philosophy:**
- Choose boring, reliable, well-supported technologies over cutting-edge options
- Optimize for maintainability and simplicity
- Document technical decisions in TECHNICAL.md (for future developers, not for Adam)
- Avoid over-engineering
- Make it work first, make it elegant second

**Your Technical Decisions Must Be Documented In:**
TECHNICAL.md file (separate from this file, for future developers)

---

## Section 4: When to Involve Adam

**Only bring decisions to Adam when they directly affect what he will see or experience.**

**When You Do Involve Him:**
- Explain the tradeoff in plain language
- Tell him how each option affects his experience (speed, appearance, ease of use)
- Give your recommendation and why
- Make it easy for him to just say "go with your recommendation"

**Examples of WHEN to ask Adam:**
- "This can load instantly but will look simpler, or look richer but take 2 seconds to load. Which matters more to you?"
- "I can make this work on phones too, but it will take an extra day. Worth it?"
- Visual design choices (color schemes, layouts)
- Feature prioritization (what to build first)
- User experience tradeoffs

**Examples of when NOT to ask Adam:**
- Anything about databases, APIs, frameworks, languages, or architecture
- Library choices, dependency decisions, file organization
- How to implement any feature technically
- Testing strategies or CI/CD setup
- Performance optimization approaches
- Security implementation details

---

## Section 5: Engineering Standards

**Apply these automatically without discussion:**

- Write clean, well-organized, maintainable code
- Implement comprehensive automated testing (unit, integration, end-to-end as appropriate)
- Build in self-verification - the system should check itself works correctly
- Handle errors gracefully with friendly, non-technical error messages for users
- Include input validation and security best practices
- Make it easy for a future developer to understand and modify
- Use version control properly with clear commit messages
- Set up any necessary development/production environment separation
- Privacy-first architecture where possible (encryption, ability to keep data private)
- Minimize surveillance/tracking (Adam specifically requested this)

---

## Section 6: Quality Assurance

**Before Showing Adam Anything:**
- Test everything yourself
- Make sure it actually works
- Fix any broken functionality
- Never show him something broken or ask him to verify technical functionality

**If Something Isn't Working:**
- Fix it, don't explain the technical problem to Adam
- Only show him working features

**Build in Automated Checks:**
- System should verify it works correctly
- Run checks before any changes go live
- Catch errors before Adam sees them

---

## Section 7: Showing Progress

**When Demonstrating Progress:**
- Show working demos whenever possible - let Adam click around and try things
- Use screenshots or screen recordings when demos aren't practical
- Describe changes in terms of what he'll experience, not what you changed technically
- Celebrate milestones in terms he cares about:
  - ✅ "You can now paste in your blog posts and see extracted propositions"
  - ❌ "Implemented the RAG pipeline with vector embeddings"

**Everything Adam Sees Should Work:**
- No placeholder functionality
- No "this will work when I finish X"
- Show rough drafts, but rough drafts that function

---

## Section 8: Project-Specific Details

### What We're Building

**Project Name:** Universal Worldview Mapping Tool (working title)

**Core Functionality:**
1. **Proposition Extraction System**
   - Accept large text corpuses (blogs, journals, writing)
   - Use AI to extract propositions/claims from the text
   - Organize propositions from foundational to derivative
   - Present propositions one at a time for user feedback

2. **Worldview Mapping Interface**
   - User can affirm, reject, or nuance each proposition
   - Allow for corrections and edits, not just yes/no
   - Build a personalized concept graph based on responses
   - Start with foundational beliefs, work up to complex/derivative ones

3. **Multiple Visualization Modes**
   - Network/graph visualization (nodes and edges showing concept relationships)
   - Hierarchical tree view
   - Other visualization approaches as appropriate
   - Should be explorable and navigable

4. **Personalized Chatbot**
   - Chatbot that consults the user's worldview graph
   - Still has general LLM knowledge, just tailored using the personalized graph
   - Can "play Experimental Unit" with visitors
   - Engages people based on the mapped worldview

5. **Privacy & Sharing Features**
   - Users can keep their worldview graphs private
   - Users can share their graphs with others
   - Users can export their data
   - Minimize surveillance/tracking where possible

6. **Universal Applicability**
   - Tool works for anyone, not just Adam
   - "Tailors the experience based on initial conditions like chaos math"
   - Personalized concept spaces, not "average" ones
   - Eventually: ability to weave multiple people's graphs together, find isomorphisms

### First Use Case: Adam's Experimental Unit Content

**The Test:**
- 672 published posts from experimentalunit.substack.com
- All posts are public and free
- Need to crawl/fetch all content programmatically
- Extract propositions from this dense, philosophically rich corpus
- Let Adam build his MUU worldview graph
- This becomes the proof-of-concept

**Not Ready Until:**
- Adam's Substack content is fully integrated
- He can extract propositions from all 672 posts
- He can build his worldview graph
- The chatbot can engage using his graph

**Then It's For Everyone:**
- Once it works for Adam, make it available to anyone
- Other people can paste in their writing
- Build their own worldview graphs
- Create their own personalized chatbots

### Visual Design

**Color Palette:**
Primary (in order of importance):
1. Orange
2. Purple
3. Forest Green
4. Grey
5. Black

Secondary:
- Neon Yellow
- Ocean Blue
- Pink
- White
- Red

"All the colors really but with those emphases"

**Feel:**
- General purpose tool that feels powerful but accessible
- Start simple, complexity emerges from use
- Should feel somewhat experimental/futuristic
- Not overly clinical, but not cluttered
- The interface should feel like it respects the depth of ideas being mapped

### Audience

**Primary:** Anyone who writes or thinks and wants to map their worldview
**Secondary Audiences:**
- Adam's Experimental Unit community
- Artists and writers exploring their own thinking
- Philosophers, autodidacts, generalists
- People interested in personalized AI/concept spaces
- Eventually: people who want to find others with similar/different worldviews

**Success Looks Like:**
- "Normal people" can engage with Adam's ideas through the chatbot
- People find it captivating and get drawn into new ways of looking at things
- Adam's work becomes more navigable and understandable
- The tool works for anyone's writing, not just Adam's
- People can see how their worldviews connect to others'

### Technical Constraints

**Budget:** ~$500 for hosting and AI API costs
- Be mindful of costs with AI proposition extraction
- Optimize for efficiency where possible
- Consider caching, batch processing, etc.

**Data Source:**
- All 672 posts from experimentalunit.substack.com
- Posts are public, fetch programmatically
- No file upload required (Adam tried but upload didn't work)

**Must Support:**
- Large text volumes (672 posts is just the first test case)
- Multiple users eventually
- Privacy options
- Multiple visualization types
- Export functionality

### Adam's Expertise & Background

**Adam's Experimental Unit covers:**
- Planetary emergency response
- Military/strategic thinking repurposed for non-military use (Ben Zweibelson's work, design theory, operational art)
- Alternative Reality Games (ARG) as conceptual framework
- Public worship and merrymaking as emergency response
- Complexity science, phantasmal war theory
- Process philosophy, mythology, comparative religion
- Grimes as cultural figure/inspiration
- Space Command and military transformation
- Buddhist skillful means (upaya)
- Conceptual emergency and new frameworks for meaning-making

**Key Concepts to Understand:**
- MUU: Mixed, Unclear, Unstable - core philosophical framework
- Experimental Unit: multivalent (informal organization, ARG, conceptual framework, performance art)
- "Playing Experimental Unit": engaging in innovative emergency response, public worship, or merrymaking
- Phantasmal war: complexity science approach to conflict (via Zweibelson)
- OSA series: Operational Situational Assessments - tactical/philosophical analyses

**Adam's Writing Style:**
- Dense, philosophically rich
- "Apophatic psycho-strategic confessionalism"
- References are "psychic infrastructure" not just citations
- Operates across multiple registers: strategic critique, meta-psychological confession, memetic hyperlinking
- Creates new conceptual frameworks and language

### What This Tool Enables

**For Adam:**
- Makes 672 posts navigable and structured
- Reveals his current worldview as a living graph
- Powers a chatbot that can introduce people to XU concepts
- Creates multiple entry points for different audiences

**For Others:**
- Map their own belief systems
- Discover what they actually think by reviewing extracted propositions
- Create personalized AI that understands their worldview
- Find others with compatible/interesting worldviews (eventually)

**The Bigger Vision:**
- Personal concept spaces (not averaged/generalized)
- Memory palace-like navigation through worldviews
- Weaving together different people's mental maps
- Finding isomorphisms between worldviews
- Eventually: VR/3D navigation, game mechanics, board game implementations

**Not Included in Phase 1:**
- VR implementation
- Board game mechanics
- Multi-user graph weaving/isomorphism finding
- Phone app
(These are future possibilities, not initial requirements)

---

## Working Together: Current Session Context

**Development Branch:**
- All development on branch: `claude/discovery-interview-setup-bQYPe`
- Commit changes with clear messages
- Push to this branch when ready

**Session Status:**
- Interview completed
- Ready to begin implementation
- First task: Crawl all 672 Substack posts
- Then: Build proposition extraction system
- Then: Create worldview mapping interface

---

*This document guides all work on the Experimental Unit Worldview Mapping project. All technical decisions should be documented separately in TECHNICAL.md.*
