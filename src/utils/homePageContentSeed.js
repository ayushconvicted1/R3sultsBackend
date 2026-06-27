/**
 * Seed data for the redesigned r3sults.org home page CMS.
 * This is the default content that populates the home_page_content table.
 *
 * Schema: matches GET /api/home-page-content response contract.
 */

const homePageContentSeed = {
  hero: {
    eyebrow: 'Nonprofit Disaster Management',
    headline: 'Prepared Before.',
    headlineAccent: 'Present During.',
    headlineSuffix: 'Committed After.',
    subtext:
      "We don't just respond to disasters. We prepare communities, manage response, and stay until recovery and rebuilding is complete.",
    ctaPrimary: 'Donate Now',
    ctaSecondary: 'Become a Partner',
    heroImage: 'https://cdn.r3sults.org/images/hero-main.jpg',
    stats: [
      { value: '20+', label: 'Years Experience' },
      { value: '24/7', label: 'Rapid Response' },
      { value: '10+', label: 'Countries Served' },
      { value: '100%', label: 'Transparency' },
    ],
  },

  approach: {
    eyebrow: 'Our Methodology',
    heading: 'Full-Cycle Disaster Management',
    statement: 'We stay until rebuilding is complete — not just until headlines fade.',
    backgroundImage: 'https://cdn.r3sults.org/images/approach-bg.jpg',
    phases: [
      {
        number: '01',
        title: 'PREPARE',
        headline: 'Prevention Saves Lives',
        items: [
          'Risk assessment & vulnerability mapping',
          'Community training programs',
          'Infrastructure readiness audits',
          'Pre-positioned resources & supply chains',
        ],
      },
      {
        number: '02',
        title: 'RESPOND',
        headline: 'Deployed Within Hours',
        items: [
          'On-ground disaster response teams',
          'Medical & emergency logistics',
          'Rapid deployment operations',
          'Technology-enabled coordination',
        ],
      },
      {
        number: '03',
        title: 'RECOVER & REBUILD',
        headline: "We Stay Until It's Done",
        items: [
          'Long-term rehabilitation programs',
          'Housing & infrastructure restoration',
          'Economic restart initiatives',
          'Community resilience systems',
        ],
      },
    ],
  },

  impact: {
    eyebrow: 'Our Impact',
    heading: '20+ Years. Thousands Helped.',
    headingAccent: 'Countless Lives Impacted.',
    stats: [
      {
        end: 20,
        suffix: '+',
        label: 'Years of Disaster Management Experience',
        description: 'Two decades of on-the-ground expertise across multiple disaster types.',
      },
      {
        end: 50,
        suffix: 'K+',
        label: 'Families Assisted',
        description: 'Thousands of families reached with emergency relief, shelter, and recovery support.',
      },
      {
        end: 10,
        suffix: '+',
        label: 'Countries Served',
        description: 'International deployments across multiple continents and disaster zones.',
      },
      {
        end: 24,
        suffix: '/7',
        label: 'Rapid Response Capability',
        description: 'Around-the-clock operational readiness for immediate deployment.',
      },
    ],
  },

  operations: {
    eyebrow: 'How We Operate',
    heading: 'Efficient. Transparent.',
    headingAccent: 'Resource-Optimized.',
    subtext:
      'We are operationally disciplined — not just emotionally driven. Every system, every process, every partnership is designed to maximize impact for those we serve.',
    pillars: [
      {
        number: '01',
        title: 'Volunteer-Driven Operations',
        body: 'Our lean structure is powered by committed volunteers with professional expertise, keeping overhead minimal and impact maximal.',
      },
      {
        number: '02',
        title: 'Deep Supplier Network',
        body: 'Years of partnerships translate into discounted procurement agreements and pre-positioned resources ready for immediate deployment.',
      },
      {
        number: '03',
        title: 'Technology-Driven Coordination',
        body: 'Real-time logistics, GPS asset tracking, and data-driven resource allocation ensure nothing falls through the cracks.',
      },
      {
        number: '04',
        title: 'Low Overhead Model',
        body: 'We operate lean so more of every donated dollar reaches the communities and families who need it most.',
      },
      {
        number: '05',
        title: 'Direct Resource Allocation',
        body: 'Funds flow directly to affected communities — no excessive administrative layers between your donation and real impact.',
      },
      {
        number: '06',
        title: 'Full Transparency & Reporting',
        body: 'Comprehensive impact reports, audited financials, and real-time deployment updates keep donors informed and accountable.',
      },
    ],
    positioning: {
      eyebrow: 'Our Positioning',
      heading: 'This is not just a charity. This is a',
      headingAccent: 'disaster management authority.',
      points: [
        'A preparedness-first organization',
        'A long-term recovery partner',
        'A 20+ year experienced response team',
        'A systems-driven humanitarian operation',
      ],
    },
  },

  testimonials: {
    eyebrow: 'Voices from the Field',
    heading: 'Real Stories. Real Impact.',
    items: [
      {
        image: 'https://cdn.r3sults.org/images/testimonial-1.jpg',
        name: 'Maria Gonzalez',
        role: 'Survivor',
        location: 'Houston, TX',
        type: 'survivor',
        quote:
          "When the floodwaters rose, R3sults was the first team on the ground. They didn't just hand out supplies and leave — they stayed with our community for months until we were truly back on our feet.",
      },
      {
        image: 'https://cdn.r3sults.org/images/testimonial-2.jpg',
        name: 'James Okafor',
        role: 'Volunteer Field Coordinator',
        location: 'Lagos, Nigeria',
        type: 'volunteer',
        quote:
          "I've worked with many disaster response organizations. R3sults operates with a discipline and efficiency I've never seen elsewhere. The systems in place mean nothing falls through the cracks when it matters most.",
      },
      {
        image: 'https://cdn.r3sults.org/images/testimonial-3.jpg',
        name: 'David Chen',
        role: 'Partner, Global Aid Alliance',
        location: 'New York, NY',
        type: 'partner',
        quote:
          'We partner with R3sults because of one simple reason: they deliver results. Their transparency, accountability, and operational precision make them the most trusted partner in the space.',
      },
    ],
  },

  donate: {
    eyebrow: 'Make a Difference',
    heading: 'Be the Reason Recovery Happens',
    subtext: 'Every dollar is tracked, reported, and directed to communities that need it most.',
    tiers: [
      {
        amount: 50,
        label: 'Emergency Relief Kit',
        description: 'Provides an individual with immediate emergency supplies and clean water access.',
      },
      {
        amount: 250,
        label: 'Family Survival Package',
        description: 'Food, shelter materials, and hygiene supplies for a family of four for two weeks.',
      },
      {
        amount: 1000,
        label: 'Temporary Shelter Support',
        description: 'Funds construction of temporary shelter for a displaced family during recovery.',
      },
    ],
    trustHeading: 'Our Commitment to You',
    legalNote:
      'R3sults Foundation is a registered 501(c)(3) nonprofit organization. All donations are tax-deductible to the fullest extent allowed by law. We publish annual impact reports with full financial disclosure.',
  },

  stories: {
    eyebrow: 'Stories & Updates',
    heading: 'From the Field',
    items: [
      {
        image: 'https://cdn.r3sults.org/images/story-1.jpg',
        category: 'Active Deployment',
        date: 'March 2026',
        title: 'Flood Response Operations: Louisiana Gulf Coast',
        excerpt:
          'Our team of 40 deployed within 6 hours of the Category 3 landfall. Supply distribution reached 2,400 families in the first 72 hours.',
        href: '/stories/flood-response-louisiana-gulf-coast',
      },
      {
        image: 'https://cdn.r3sults.org/images/story-2.jpg',
        category: 'Recovery Progress',
        date: 'February 2026',
        title: 'Six Months After the Earthquake: A Community Rebuilt',
        excerpt:
          'One year into our Haiti partnership, 340 families have moved into permanent housing and the local economy is showing measurable recovery.',
        href: '/stories/six-months-after-the-earthquake',
      },
      {
        image: 'https://cdn.r3sults.org/images/story-3.jpg',
        category: 'Behind the Scenes',
        date: 'January 2026',
        title: 'How Our Logistics Network Delivers in 24 Hours',
        excerpt:
          'A look inside our pre-positioned supply network and the technology that allows us to deploy faster than any other organization in the region.',
        href: '/stories/how-our-logistics-network-delivers',
      },
    ],
  },

  news: {
    eyebrow: 'News & Media',
    heading: 'Disaster Intelligence',
    subtext: 'Real-time coverage of global disasters, emergency response operations, and humanitarian developments.',
    leadStory: {
      category: 'Breaking',
      source: 'Reuters',
      date: 'March 1, 2026',
      readTime: '4 min read',
      title: 'Catastrophic Flooding Displaces 1.2 Million Across Southeast Asia',
      excerpt:
        'Record monsoon rainfall has caused catastrophic flooding across Vietnam, Thailand, and Myanmar. The United Nations estimates 1.2 million people have been displaced, with hundreds of communities cut off from emergency services.',
      tags: ['Southeast Asia', 'Flooding', 'Displacement', 'UN Response'],
      href: '/stories',
    },
    sideStories: [
      {
        category: 'Wildfire',
        source: 'AP News',
        date: 'Feb 28, 2026',
        title: 'California Wildfires Force Mass Evacuations in Three Counties',
        excerpt:
          'Fast-moving wildfires driven by Santa Ana winds have prompted mandatory evacuations across 85,000 residents in Ventura, San Bernardino, and Riverside counties.',
        href: '/stories',
      },
      {
        category: 'Earthquake',
        source: 'BBC',
        date: 'Feb 27, 2026',
        title: "7.4 Magnitude Earthquake Strikes Off Japan's Pacific Coast",
        excerpt:
          'A powerful 7.4 magnitude earthquake struck 120km off the Tohoku coast. Tsunami warnings have been issued for low-lying coastal areas.',
        href: '/stories',
      },
      {
        category: 'Hurricane',
        source: 'CNN',
        date: 'Feb 25, 2026',
        title: 'Caribbean Braces as Category 4 Storm Approaches Lesser Antilles',
        excerpt:
          'Authorities in Dominica, St. Lucia, and Martinique have issued mandatory evacuation orders as the storm intensifies to Category 4 with 145 mph winds.',
        href: '/stories',
      },
    ],
    wireItems: [
      { time: '2h ago', headline: 'FEMA activates Emergency Operations Center for Gulf Coast flooding', source: 'FEMA' },
      { time: '4h ago', headline: 'WHO reports cholera risk rising in post-earthquake Haiti camps', source: 'WHO' },
      { time: '6h ago', headline: 'Red Cross deploys 200 volunteers to Tennessee tornado zone', source: 'Red Cross' },
      { time: '9h ago', headline: 'Pakistan declares national emergency as glacial lake outburst flood spreads', source: 'Reuters' },
      { time: '12h ago', headline: "Australian bushfire season declared 'worst in a decade' by meteorologists", source: 'ABC Australia' },
      { time: '14h ago', headline: 'UN Security Council calls emergency session on Sudan humanitarian crisis', source: 'UN News' },
    ],
  },

  volunteer: {
    volunteerCard: {
      eyebrow: 'Get Involved',
      heading: 'Volunteer With Us',
      subtext:
        'We need skilled professionals — logistics coordinators, medical personnel, engineers, communications specialists, and community liaisons. Your skills can save lives.',
      roles: ['Field Response Teams', 'Logistics & Supply Chain', 'Medical Support', 'Community Training'],
      ctaText: 'Apply to Volunteer',
      ctaLink: '/volunteer',
    },
    partnerCard: {
      eyebrow: 'Partnership',
      heading: 'Become a Partner',
      subtext:
        'Corporate and institutional partners bring resources, networks, and expertise that multiply our impact. Join a coalition of organizations committed to real results.',
      roles: ['Corporate Matching Programs', 'Resource & Equipment Donations', 'Technology Partnerships', 'Media & Communications'],
      ctaText: 'Partner With Us',
      ctaLink: '/partner',
    },
  },
};

module.exports = homePageContentSeed;
