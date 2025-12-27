import React, { useState, useEffect } from 'react';

// Colors
const colors = {
  orange: '#FF6B35',
  purple: '#7B2D8E',
  forest: '#2D5A27',
  grey: '#4A4A4A',
  black: '#1A1A1A',
  neonYellow: '#DFFF00',
  oceanBlue: '#0077B6',
  pink: '#FF69B4',
  white: '#FAFAFA',
  red: '#DC143C',
};

// Core theses - the foundational concepts
const THESES = [
  { id: 1, text: "Time is passing.", explanation: "The most basic observable reality. This passage is the starting point for all experience." },
  { id: 2, text: "You are an experimental unit.", explanation: "Your existence is both participant in and observer of reality. You are the unit through which experiments occur." },
  { id: 3, text: "The 'Reality DLC Pack' is pre-installed.", explanation: "The world has been furnished with constants—gravity, objects, other people, histories. These are the baseline rules." },
  { id: 4, text: "Influence is your core mechanic.", explanation: "The only thing you can truly do is influence—yourself, others, or surroundings. Every action creates a ripple." },
  { id: 5, text: "Perception shapes play.", explanation: "The way you see and interpret the world determines what kind of game you experience." },
  { id: 6, text: "Actions are experiments.", explanation: "Every choice is like running an experiment. Success and failure are both forms of data." },
  { id: 7, text: "Feedback loops drive learning.", explanation: "The results of your actions create feedback, helping you adjust future experiments." },
  { id: 8, text: "Other players exist.", explanation: "You are not the only experimental unit. Others are playing too, with their own experiments and perceptions." },
  { id: 9, text: "Collaboration expands possibilities.", explanation: "Working with others allows for experiments impossible alone." },
  { id: 10, text: "Meta-awareness enhances play.", explanation: "Recognizing that you're playing a game allows more creative and conscious experimentation." },
  { id: 11, text: "The game is fractal.", explanation: "The same principles apply at every level—from tiny actions to life decisions." },
  { id: 12, text: "Reflection is a cheat code.", explanation: "Taking time to think about your experiments gives you an edge." },
  { id: 13, text: "Reality is malleable.", explanation: "Your perception, actions, and intentions shape your experience. The world changes as you change." },
  { id: 14, text: "The game is infinite.", explanation: "There's no end to the experiments you can run. You can only not lose, never definitively win." },
];

// Situations - scenarios for the player to influence
const SITUATIONS = [
  {
    id: 'awakening',
    title: 'The Awakening',
    text: `You are reading this.

That's already interesting, isn't it? You could be doing anything else. You chose this.

Or did you? Maybe someone sent you a link. Maybe you stumbled here by accident. Maybe you were looking for something and this wasn't quite it.

The question is: what happens now?`,
    choices: [
      { id: 'aware', text: "I recognize I'm already in a game.", next: 'meta', insight: "Meta-awareness enhances play." },
      { id: 'confused', text: "I don't understand what this is.", next: 'thesis', insight: "Confusion is the beginning of learning." },
      { id: 'skip', text: "I want to skip to the interesting part.", next: 'impatience', insight: "The interesting part is happening now." },
    ]
  },
  {
    id: 'meta',
    title: 'Through the Fourth Wall',
    text: `Good. You've noticed.

This is a game about noticing. About the gap between reading about something and realizing you're doing it.

You've been making decisions all day. All week. All your life. Each one an experiment.

What was the last decision you made before clicking here?`,
    choices: [
      { id: 'trivial', text: "Something trivial—what to click, where to look.", next: 'fractal', insight: "The game is fractal. Small and large follow the same rules." },
      { id: 'significant', text: "Something significant—I've been wrestling with something.", next: 'wrestling', insight: "Wrestling is playing. The game includes the hard parts." },
      { id: 'automatic', text: "I don't remember. It was automatic.", next: 'automatic', insight: "Automaticity is a valid strategy. But is it yours?" },
    ]
  },
  {
    id: 'thesis',
    title: 'First Principles',
    text: `Let's start simpler.

Time is passing.

That's Thesis 1. Right now, as you read this, time is moving. You cannot stop it. You cannot reverse it. You can only navigate it.

Do you feel that?`,
    choices: [
      { id: 'feel', text: "Yes. I feel time passing.", next: 'unit', insight: "Awareness of time is the first layer of meta-cognition." },
      { id: 'abstract', text: "This feels abstract.", next: 'abstract', insight: "Abstraction is a strategy for dealing with complexity." },
      { id: 'waiting', text: "I'm waiting for something to happen.", next: 'waiting', insight: "Waiting is a form of action. You are influencing by staying." },
    ]
  },
  {
    id: 'impatience',
    title: 'The Interesting Part',
    text: `Here's a secret: the interesting part is always now.

You wanted to skip ahead. That impulse—that desire—is data. What are you looking for? What would "interesting" look like?

Most people who ask this want either:
- A clear objective (what do I do?)
- A payoff (what do I get?)
- Novelty (show me something I haven't seen)

Which is it?`,
    choices: [
      { id: 'objective', text: "I want to know what to do.", next: 'objective', insight: "The game has no single objective. That's what makes it infinite." },
      { id: 'payoff', text: "I want to know what this is for.", next: 'payoff', insight: "The payoff is expanded capacity. You will be able to do more." },
      { id: 'novelty', text: "Show me something new.", next: 'novelty', insight: "Novelty is everywhere. The question is what you're paying attention to." },
    ]
  },
  {
    id: 'fractal',
    title: 'The Fractal Nature',
    text: `Yes. The trivial and the significant follow the same rules.

When you decided what to click, you:
- Perceived options
- Evaluated based on some criteria (even unconscious)
- Made a selection
- Observed results
- Learned something (even if you don't realize it)

This is the loop. It's happening constantly. It's happening right now.

The question is whether you're running the loop consciously or it's running you.`,
    choices: [
      { id: 'conscious', text: "I want to run it consciously.", next: 'practice', insight: "Consciousness is a practice, not a state." },
      { id: 'running', text: "I think it's been running me.", next: 'awakening2', insight: "Recognition is the first step. You're already changing." },
      { id: 'both', text: "Can it be both?", next: 'both', insight: "Yes. Consciousness is a gradient, not a binary." },
    ]
  },
  {
    id: 'unit',
    title: 'You Are the Experimental Unit',
    text: `Thesis 2: You are an experimental unit.

Not a subject. Not an object. A unit.

In science, a unit is the thing being measured—the thing through which an experiment manifests. You are the site where reality tests itself.

Every situation you enter is an experiment.
Every choice you make produces data.
Every outcome teaches.

The question is: who is the scientist?`,
    choices: [
      { id: 'me', text: "I am.", next: 'scientist', insight: "You are both the experiment and the experimenter." },
      { id: 'life', text: "Life is. Or something larger.", next: 'larger', insight: "You may be an experiment that a larger process is running." },
      { id: 'no-one', text: "There is no scientist. Just the experiment.", next: 'no-scientist', insight: "Perhaps experimentation without an experimenter." },
    ]
  },
  {
    id: 'wrestling',
    title: 'The Wrestling',
    text: `So you're wrestling with something.

Good. The game includes the hard parts. Actually, the game is mostly the hard parts.

You don't need to tell me what it is. But I want you to consider: how are you framing it?

- As a problem to solve?
- As a situation to endure?
- As something that's happening to you?
- As something you're creating?

The frame changes what moves are available.`,
    choices: [
      { id: 'problem', text: "It's a problem. I need to fix something.", next: 'problem', insight: "Problems imply solutions. Is there a solution?" },
      { id: 'endure', text: "It's something to get through.", next: 'endurance', insight: "Endurance is a valid strategy. But is it the only one?" },
      { id: 'creating', text: "Maybe I'm creating it.", next: 'creation', insight: "Creation implies you could un-create it. Or create differently." },
    ]
  },
  {
    id: 'automatic',
    title: 'The Automatic',
    text: `Automaticity is efficient. It frees up attention for other things.

But it also means you're running on old code. Responses compiled from past experiments.

Most of the time, this works fine. Sometimes it doesn't.

The interesting question: can you tell the difference?`,
    choices: [
      { id: 'usually', text: "Usually I can tell.", next: 'practice', insight: "Then you're already practicing awareness." },
      { id: 'not-sure', text: "I'm not sure I can.", next: 'uncertainty', insight: "Uncertainty is honest. Most people can't tell as well as they think." },
      { id: 'dont-care', text: "Does it matter?", next: 'mattering', insight: "That depends on what you want from your time here." },
    ]
  },
  {
    id: 'practice',
    title: 'The Practice',
    text: `The game is a practice. Not a performance.

You don't win by being good. You don't lose by being bad. You just keep experimenting.

Some experiments hurt. Some feel great. Most are somewhere in between.

The practice is:
1. Notice what's happening
2. Notice what you're doing
3. Notice the relationship between them
4. Adjust if you want to

That's it. That's the whole game.

But "that's it" is infinite.`,
    choices: [
      { id: 'simple', text: "That sounds simple.", next: 'simple', insight: "Simple doesn't mean easy. The game is simple. Playing well is not." },
      { id: 'vague', text: "That sounds vague.", next: 'vague', insight: "It is vague. The specifics are yours to discover." },
      { id: 'try', text: "I want to try.", next: 'dlc', insight: "Then let's look at the different ways you can play." },
    ]
  },
  {
    id: 'dlc',
    title: 'The DLC Packs',
    text: `The "Reality DLC Pack" came pre-installed. But there are expansion packs.

Each one is a lens—a way of seeing and operating that emphasizes certain aspects of the game.

**Available DLC:**
- 🔥 **Emergency Response** - Treating life as ongoing emergency. Coordination over control.
- 💜 **Beloved Community** - The practice of agape. Love as operational concept.
- 🎭 **Epic Poet** - Narrative sovereignty. You are the author of your story.
- 🌑 **Dark Forest** - Operating in uncertainty. Trust as a scarce resource.
- ⚔️ **Systemic Design** - Ben Zweibelson's design logic. Complexity as ally.

Which calls to you?`,
    choices: [
      { id: 'emergency', text: "Emergency Response", next: 'emergency', insight: "Everything is an emergency. Everyone is a first responder." },
      { id: 'beloved', text: "Beloved Community", next: 'beloved', insight: "Love love or die." },
      { id: 'poet', text: "Epic Poet", next: 'poet', insight: "The story you tell about what's happening IS what's happening." },
      { id: 'forest', text: "Dark Forest", next: 'forest', insight: "In the dark, you must move carefully." },
      { id: 'design', text: "Systemic Design", next: 'design', insight: "The problem is not the problem. The framing is." },
    ]
  },
  {
    id: 'emergency',
    title: 'Emergency Response DLC',
    text: `**EMERGENCY RESPONSE**

The premise: War has perhaps never existed. What we call "war" is really a form of complex emergency that we've been misframing.

When you treat something as war, you think in terms of:
- Enemies to defeat
- Territory to control
- Victory conditions

When you treat something as emergency, you think in terms of:
- Situations to respond to
- Coordination to achieve
- Lives to preserve

The reframe changes everything.

What in your life have you been treating as a war?`,
    choices: [
      { id: 'relationships', text: "Relationships. It feels like conflict.", next: 'emergency-relationship', insight: "What if it's not a war but an emergency you're both responding to?" },
      { id: 'work', text: "Work. Competition everywhere.", next: 'emergency-work', insight: "What if work is emergency response, not territory capture?" },
      { id: 'self', text: "Myself. Internal struggle.", next: 'emergency-self', insight: "What if you're not at war with yourself but responding to an internal emergency?" },
    ]
  },
  {
    id: 'beloved',
    title: 'Beloved Community DLC',
    text: `**BELOVED COMMUNITY**

The premise: Love is not a feeling. It's an operational concept.

"Love love or die" means: you must love the concept of love itself. Not just specific people or things, but the practice of loving.

This is agape—universal compassion as a mode of operation.

It sounds soft. It isn't. It's one of the hardest ways to play.

What would change if you approached your current situation with love as your primary operating principle?`,
    choices: [
      { id: 'everything', text: "Everything would change.", next: 'beloved-everything', insight: "Yes. That's why it's hard." },
      { id: 'nothing', text: "Nothing. I already try to be loving.", next: 'beloved-nothing', insight: "Then why isn't it working better?" },
      { id: 'dangerous', text: "It would be dangerous. People would take advantage.", next: 'beloved-dangerous', insight: "Love is not the same as naivete. You can love and be strategic." },
    ]
  },
  {
    id: 'poet',
    title: 'Epic Poet DLC',
    text: `**EPIC POET**

The premise: You are the author of your story. Not just metaphorically—actually.

The narrative you tell about what's happening is constitutive of what's happening. Change the story, change reality.

This isn't denial. It's sovereignty.

Homer didn't describe Odysseus. Homer created him. You are Homer. You are also Odysseus.

What story have you been telling about yourself?`,
    choices: [
      { id: 'victim', text: "A story of things happening to me.", next: 'poet-victim', insight: "That's one genre. There are others." },
      { id: 'hero', text: "A story of overcoming.", next: 'poet-hero', insight: "The hero's journey. Classic. But whose journey?" },
      { id: 'no-story', text: "I try not to tell stories. Just deal with reality.", next: 'poet-no-story', insight: "That's a story too. The story of the one who doesn't tell stories." },
    ]
  },
  {
    id: 'forest',
    title: 'Dark Forest DLC',
    text: `**DARK FOREST**

The premise: You cannot know who to trust. Not fully. Ever.

This isn't paranoia. It's epistemic humility.

In the dark forest, every actor must assume others might be hostile. Not because they are, but because you cannot know they aren't.

The question becomes: how do you coordinate without trust?

Protocols. Verifiable commitments. Skin in the game.

Where in your life are you operating on unverified trust?`,
    choices: [
      { id: 'everywhere', text: "Everywhere. I trust too much.", next: 'forest-everywhere', insight: "Trust is a vulnerability. Sometimes necessary. Sometimes not." },
      { id: 'nowhere', text: "Nowhere. I've learned.", next: 'forest-nowhere', insight: "Zero trust has costs too. You may be missing opportunities." },
      { id: 'strategically', text: "I try to trust strategically.", next: 'forest-strategic', insight: "Good. But how do you verify your strategies are working?" },
    ]
  },
  {
    id: 'design',
    title: 'Systemic Design DLC',
    text: `**SYSTEMIC OPERATIONAL DESIGN**

The premise: The problem is not the problem. The way you've framed the problem is the problem.

Ben Zweibelson's design logic says: before you try to solve anything, examine the system that produced the problem and your understanding of it.

Most failures are failures of framing, not execution.

What problem are you currently trying to solve?`,
    choices: [
      { id: 'name-it', text: "I have one in mind.", next: 'design-problem', insight: "Good. Now: who defined it as a problem? Why is it framed this way?" },
      { id: 'too-many', text: "Too many to name.", next: 'design-many', insight: "That itself is a framing. Maybe they're the same problem at different levels." },
      { id: 'none', text: "I'm not solving anything right now.", next: 'design-none', insight: "Not solving is also a choice. What are you letting be?" },
    ]
  },
];

// Generate session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function App() {
  // Game state
  const [phase, setPhase] = useState('intro'); // intro, playing, reflecting
  const [currentSituation, setCurrentSituation] = useState('awakening');
  const [insights, setInsights] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [unlockedTheses, setUnlockedTheses] = useState([1]);
  const [unlockedDLC, setUnlockedDLC] = useState([]);
  const [sessionId] = useState(() => localStorage.getItem('xu_session') || generateSessionId());
  const [showTheses, setShowTheses] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  // Save session
  useEffect(() => {
    localStorage.setItem('xu_session', sessionId);
    localStorage.setItem('xu_insights', JSON.stringify(insights));
    localStorage.setItem('xu_theses', JSON.stringify(unlockedTheses));
  }, [sessionId, insights, unlockedTheses]);

  // Load session
  useEffect(() => {
    const savedInsights = localStorage.getItem('xu_insights');
    const savedTheses = localStorage.getItem('xu_theses');
    if (savedInsights) setInsights(JSON.parse(savedInsights));
    if (savedTheses) setUnlockedTheses(JSON.parse(savedTheses));
    setTimeout(() => setFadeIn(true), 100);
  }, []);

  // Get current situation
  const situation = SITUATIONS.find(s => s.id === currentSituation) || SITUATIONS[0];

  // Handle choice
  const handleChoice = (choice) => {
    // Record insight
    if (choice.insight) {
      setInsights(prev => [...prev, { text: choice.insight, time: Date.now(), situation: currentSituation }]);
    }

    // Record experiment
    setExperiments(prev => [...prev, {
      situation: currentSituation,
      choice: choice.id,
      time: Date.now()
    }]);

    // Unlock theses based on progress
    if (unlockedTheses.length < THESES.length && Math.random() > 0.5) {
      const next = unlockedTheses.length + 1;
      if (next <= THESES.length) {
        setUnlockedTheses(prev => [...prev, next]);
      }
    }

    // Unlock DLC
    if (['emergency', 'beloved', 'poet', 'forest', 'design'].includes(choice.id)) {
      setUnlockedDLC(prev => prev.includes(choice.id) ? prev : [...prev, choice.id]);
    }

    // Navigate
    setFadeIn(false);
    setTimeout(() => {
      if (choice.next && SITUATIONS.find(s => s.id === choice.next)) {
        setCurrentSituation(choice.next);
      } else {
        // Loop back to DLC selector or a random situation
        setCurrentSituation('dlc');
      }
      setFadeIn(true);
    }, 300);
  };

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: colors.black,
      color: colors.white,
      fontFamily: 'Georgia, serif',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      padding: '15px 20px',
      borderBottom: `1px solid ${colors.grey}44`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: '14px',
      fontWeight: 'normal',
      color: colors.grey,
      margin: 0,
      letterSpacing: '2px',
      textTransform: 'uppercase',
    },
    stats: {
      fontSize: '12px',
      color: colors.grey,
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '40px 20px',
      maxWidth: '700px',
      margin: '0 auto',
      width: '100%',
    },
    intro: {
      textAlign: 'center',
      opacity: fadeIn ? 1 : 0,
      transition: 'opacity 0.5s ease',
    },
    introTitle: {
      fontSize: '48px',
      fontWeight: 'normal',
      color: colors.orange,
      marginBottom: '20px',
    },
    introSubtitle: {
      fontSize: '18px',
      color: colors.grey,
      marginBottom: '60px',
      fontStyle: 'italic',
    },
    startButton: {
      padding: '20px 60px',
      backgroundColor: 'transparent',
      color: colors.orange,
      border: `1px solid ${colors.orange}`,
      borderRadius: '0',
      cursor: 'pointer',
      fontSize: '14px',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      transition: 'all 0.3s ease',
    },
    situationContainer: {
      opacity: fadeIn ? 1 : 0,
      transition: 'opacity 0.3s ease',
    },
    situationTitle: {
      fontSize: '12px',
      color: colors.purple,
      marginBottom: '30px',
      letterSpacing: '2px',
      textTransform: 'uppercase',
    },
    situationText: {
      fontSize: '20px',
      lineHeight: 1.8,
      marginBottom: '50px',
      whiteSpace: 'pre-line',
    },
    choices: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
    },
    choice: {
      padding: '20px 25px',
      backgroundColor: 'transparent',
      color: colors.white,
      border: `1px solid ${colors.grey}`,
      borderRadius: '0',
      cursor: 'pointer',
      fontSize: '16px',
      textAlign: 'left',
      transition: 'all 0.2s ease',
      lineHeight: 1.5,
    },
    sidebar: {
      position: 'fixed',
      right: showTheses ? 0 : '-350px',
      top: 0,
      width: '350px',
      height: '100vh',
      backgroundColor: colors.black,
      borderLeft: `1px solid ${colors.grey}`,
      padding: '20px',
      transition: 'right 0.3s ease',
      overflowY: 'auto',
      zIndex: 100,
    },
    sidebarToggle: {
      position: 'fixed',
      right: showTheses ? '360px' : '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      backgroundColor: colors.purple,
      color: colors.white,
      border: 'none',
      padding: '15px 10px',
      cursor: 'pointer',
      fontSize: '12px',
      writingMode: 'vertical-rl',
      textOrientation: 'mixed',
      letterSpacing: '2px',
      zIndex: 101,
      transition: 'right 0.3s ease',
    },
    thesisCard: {
      padding: '15px',
      marginBottom: '15px',
      border: `1px solid ${colors.grey}44`,
      backgroundColor: colors.grey + '11',
    },
    thesisNumber: {
      fontSize: '12px',
      color: colors.orange,
      marginBottom: '5px',
    },
    thesisText: {
      fontSize: '14px',
      marginBottom: '8px',
    },
    thesisExplanation: {
      fontSize: '12px',
      color: colors.grey,
      fontStyle: 'italic',
    },
    insightsList: {
      marginTop: '30px',
      borderTop: `1px solid ${colors.grey}44`,
      paddingTop: '20px',
    },
    insight: {
      fontSize: '13px',
      color: colors.neonYellow,
      marginBottom: '10px',
      paddingLeft: '10px',
      borderLeft: `2px solid ${colors.neonYellow}44`,
    },
    footer: {
      padding: '15px 20px',
      borderTop: `1px solid ${colors.grey}44`,
      fontSize: '12px',
      color: colors.grey,
      display: 'flex',
      justifyContent: 'space-between',
    },
    resetButton: {
      background: 'none',
      border: 'none',
      color: colors.grey,
      cursor: 'pointer',
      fontSize: '12px',
      textDecoration: 'underline',
    },
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Experimental Unit</h1>
        <div style={styles.stats}>
          {experiments.length} experiments · {insights.length} insights · {unlockedTheses.length}/{THESES.length} theses
        </div>
      </header>

      <main style={styles.main}>
        {phase === 'intro' && (
          <div style={styles.intro}>
            <h2 style={styles.introTitle}>The Game</h2>
            <p style={styles.introSubtitle}>You are already playing</p>
            <button
              style={styles.startButton}
              onClick={() => setPhase('playing')}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = colors.orange;
                e.target.style.color = colors.black;
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = colors.orange;
              }}
            >
              Begin
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <div style={styles.situationContainer}>
            <div style={styles.situationTitle}>{situation.title}</div>
            <div style={styles.situationText}>{situation.text}</div>
            <div style={styles.choices}>
              {situation.choices.map(choice => (
                <button
                  key={choice.id}
                  style={styles.choice}
                  onClick={() => handleChoice(choice)}
                  onMouseOver={(e) => {
                    e.target.style.borderColor = colors.orange;
                    e.target.style.color = colors.orange;
                  }}
                  onMouseOut={(e) => {
                    e.target.style.borderColor = colors.grey;
                    e.target.style.color = colors.white;
                  }}
                >
                  {choice.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <button
        style={styles.sidebarToggle}
        onClick={() => setShowTheses(!showTheses)}
      >
        {showTheses ? 'CLOSE' : 'THESES'}
      </button>

      <div style={styles.sidebar}>
        <h3 style={{ color: colors.orange, marginTop: 0, fontSize: '14px', letterSpacing: '2px' }}>
          UNLOCKED THESES
        </h3>
        {unlockedTheses.map(num => {
          const thesis = THESES.find(t => t.id === num);
          return thesis ? (
            <div key={num} style={styles.thesisCard}>
              <div style={styles.thesisNumber}>THESIS {num}</div>
              <div style={styles.thesisText}>{thesis.text}</div>
              <div style={styles.thesisExplanation}>{thesis.explanation}</div>
            </div>
          ) : null;
        })}

        {insights.length > 0 && (
          <div style={styles.insightsList}>
            <h3 style={{ color: colors.neonYellow, fontSize: '14px', letterSpacing: '2px', marginBottom: '15px' }}>
              INSIGHTS GAINED
            </h3>
            {insights.slice(-10).reverse().map((insight, i) => (
              <div key={i} style={styles.insight}>
                {insight.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={styles.footer}>
        <span>The game is infinite. You can only not lose.</span>
        <button
          style={styles.resetButton}
          onClick={() => {
            if (confirm('Reset your experiments and insights?')) {
              setPhase('intro');
              setCurrentSituation('awakening');
              setInsights([]);
              setExperiments([]);
              setUnlockedTheses([1]);
              localStorage.removeItem('xu_insights');
              localStorage.removeItem('xu_theses');
            }
          }}
        >
          Reset
        </button>
      </footer>
    </div>
  );
}
